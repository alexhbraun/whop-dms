import type { NextApiRequest, NextApiResponse } from "next";

// --- Response Types ---
type DiagnosticEntry = {
  attempt: string;
  status: number;
  headers: Record<string, string>;
  rawBody: string;
  error?: string;
};

type SuccessResponse = {
  ok: true;
  meStatus: number;
  me: any;
};

type ErrorResponse = {
  ok: false;
  reason: string;
  diagnostics: DiagnosticEntry[];
};

// --- Utility Functions ---
function maskSecret(value: string | undefined, keep = 4): string {
  if (!value) return "";
  if (value.length <= keep) return "*".repeat(value.length);
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

async function fetchWithRetries(
  url: string,
  options: RequestInit,
  attemptName: string,
  diagnostics: DiagnosticEntry[]
): Promise<Response> {
  let currentUrl = url;
  let currentOptions = { ...options };
  let attempt = 0;
  const maxRedirects = 5;

  while (attempt < maxRedirects) {
    attempt++;
    try {
      const response = await fetch(currentUrl, { ...currentOptions, redirect: 'manual' });
      const rawBody = (await response.text()).slice(0, 4000); // Capture first 4000 chars

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          console.log(`[WHOP_INSTALL] Following redirect (${response.status}) to: ${location}`);
          currentUrl = location;
          continue; // Retry with new URL
        }
      }

      diagnostics.push({
        attempt: `${attemptName} (HTTP ${response.status})`,
        status: response.status,
        headers,
        rawBody,
      });
      return response;
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      diagnostics.push({
        attempt: `${attemptName} (Network Error)`,
        status: 0,
        headers: {},
        rawBody: "",
        error: errorMsg,
      });
      throw new Error(`Network error on ${attemptName}: ${errorMsg}`);
    }
  }
  throw new Error(`Exceeded max redirects (${maxRedirects}) for ${attemptName}`);
}

async function exchangeToken(
  code: string,
  redirect_uri: string,
  client_id: string,
  client_secret: string,
  variant: 'body' | 'basic',
  diagnostics: DiagnosticEntry[]
): Promise<{ accessToken: string; refreshToken?: string; rawJson: any } | null> {
  const tokenEndpoint = 'https://whop.com/api/v2/oauth/token';
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri,
  });

  const options: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
  };

  if (variant === 'body') {
    form.set('client_id', client_id);
    form.set('client_secret', client_secret);
    options.body = form.toString();
  } else {
    const basicAuth = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    options.headers = { ...options.headers, 'Authorization': `Basic ${basicAuth}` };
    options.body = form.toString();
  }

  console.log(`[WHOP_INSTALL] Attempting token exchange (variant: ${variant})`,
    { client_id: maskSecret(client_id), redirect_uri });

  try {
    const resp = await fetchWithRetries(tokenEndpoint, options, `Token Exchange (${variant})`, diagnostics);
    const rawText = await resp.text();

    let json: any;
    try {
      json = JSON.parse(rawText);
    } catch {
      console.error(`[WHOP_INSTALL] Token exchange (${variant}) non-JSON response:`, rawText.slice(0, 200));
      diagnostics.push({
        attempt: `Token Exchange (${variant}) - JSON Parse Error`,
        status: resp.status,
        headers: Object.fromEntries(resp.headers.entries()),
        rawBody: rawText.slice(0, 4000),
        error: "Non-JSON response received",
      });
      return null;
    }

    if (!resp.ok || !json?.access_token) {
      console.error(`[WHOP_INSTALL] Token exchange (${variant}) failed:`, json);
      diagnostics.push({
        attempt: `Token Exchange (${variant}) - API Error`,
        status: resp.status,
        headers: Object.fromEntries(resp.headers.entries()),
        rawBody: rawText.slice(0, 4000),
        error: json?.error_description || json?.error || "Unknown API error",
      });
      return null;
    }

    console.log(`[WHOP_INSTALL] Token exchange (${variant}) successful.`);
    return { accessToken: json.access_token, refreshToken: json.refresh_token, rawJson: json };
  } catch (e: any) {
    console.error(`[WHOP_INSTALL] Token exchange (${variant}) unhandled error:`, e);
    return null; // Error already pushed to diagnostics in fetchWithRetries
  }
}

async function verifyToken(
  accessToken: string,
  diagnostics: DiagnosticEntry[]
): Promise<{ status: number; me: any } | null> {
  const meEndpoint = 'https://whop.com/api/v2/me';
  console.log('[WHOP_INSTALL] Verifying token with /me endpoint');

  try {
    const resp = await fetchWithRetries(meEndpoint, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }, 'Token Verification', diagnostics);
    const rawText = await resp.text();

    let meJson: any;
    try {
      meJson = JSON.parse(rawText);
    } catch {
      console.error('[WHOP_INSTALL] /me non-JSON response:', rawText.slice(0, 200));
      diagnostics.push({
        attempt: 'Token Verification - JSON Parse Error',
        status: resp.status,
        headers: Object.fromEntries(resp.headers.entries()),
        rawBody: rawText.slice(0, 4000),
        error: "Non-JSON response received from /me",
      });
      return null;
    }

    if (!resp.ok) {
      console.error('[WHOP_INSTALL] /me call failed:', meJson);
      diagnostics.push({
        attempt: 'Token Verification - API Error',
        status: resp.status,
        headers: Object.fromEntries(resp.headers.entries()),
        rawBody: rawText.slice(0, 4000),
        error: meJson?.error_description || meJson?.error || "Unknown /me API error",
      });
      return null;
    }

    console.log('[WHOP_INSTALL] Token verification successful.');
    return { status: resp.status, me: meJson };
  } catch (e: any) {
    console.error('[WHOP_INSTALL] Token verification unhandled error:', e);
    return null; // Error already pushed to diagnostics in fetchWithRetries
  }
}

// --- Main Handler ---
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, reason: 'method_not_allowed', diagnostics: [] });
  }

  const code = req.query.code as string | undefined;
  if (!code) {
    return res.status(400).json({ ok: false, reason: 'missing_code', diagnostics: [] });
  }

  const client_id = process.env.WHOP_CLIENT_ID;
  const client_secret = process.env.WHOP_CLIENT_SECRET;
  const redirect_uri = "https://whop-dms.vercel.app/api/whop/install";

  if (!client_id || !client_secret) {
    console.error("[WHOP_INSTALL] Missing required environment variables: WHOP_CLIENT_ID or WHOP_CLIENT_SECRET");
    return res.status(500).json({
      ok: false,
      reason: "server_config_error",
      diagnostics: [{ attempt: "Env Check", status: 500, headers: {}, rawBody: "Missing credentials",
        error: "Missing WHOP_CLIENT_ID or WHOP_CLIENT_SECRET" }],
    });
  }

  const diagnostics: DiagnosticEntry[] = [];
  let tokenExchangeResult: { accessToken: string; refreshToken?: string; rawJson: any } | null = null;
  let meVerificationResult: { status: number; me: any } | null = null;

  // Attempt Variant A: body creds
  tokenExchangeResult = await exchangeToken(code, redirect_uri, client_id, client_secret, 'body', diagnostics);

  // If Variant A failed, attempt Variant B: basic auth
  if (!tokenExchangeResult) {
    tokenExchangeResult = await exchangeToken(code, redirect_uri, client_id, client_secret, 'basic', diagnostics);
  }

  if (tokenExchangeResult) {
    // If token exchange succeeded, verify the token
    meVerificationResult = await verifyToken(tokenExchangeResult.accessToken, diagnostics);
  }

  if (tokenExchangeResult && meVerificationResult) {
    // Both token exchange and verification succeeded
    console.log("[WHOP_INSTALL] OAuth flow successful.");
    return res.status(200).json({ ok: true, meStatus: meVerificationResult.status, me: meVerificationResult.me });
  } else {
    // OAuth flow failed
    console.error("[WHOP_INSTALL] OAuth flow failed with diagnostics:", JSON.stringify(diagnostics, null, 2));
    return res.status(500).json({ ok: false, reason: "token_exchange_failed", diagnostics });
  }
}
