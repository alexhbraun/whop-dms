import type { NextApiRequest, NextApiResponse } from "next";

type SuccessResponse = {
  ok: true;
  me?: any; // For /me endpoint verification success
  tokenVerified?: false; // For /me endpoint verification failure, but token exchange succeeded
};

type ErrorResponse = {
  ok: false;
  reason: string;
  diagnostics: any[]; // Keep as any for flexibility in diagnostic objects
};

const WHOP_TOKEN_ENDPOINTS = [
  "https://whop.com/api/v2/oauth/token",
];

function diag(label: string, data: any) {
  const safe = JSON.stringify(data, null, 2);
  console.log(`[WHOP_INSTALL] ${label}: ${safe.length > 1800 ? safe.slice(0, 1800) + '...<truncated>' : safe}`);
}

async function postForm(url: string, body: URLSearchParams, headers: HeadersInit) {
  let res = await fetch(url, {
    method: 'POST',
    redirect: 'manual', // we’ll handle 308 ourselves
    headers,
    body,
  });

  // Handle 30x (e.g., trailing slash 308 -> '/api/v2/oauth/token/')
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location');
    if (loc) {
      const nextUrl = new URL(loc, url).toString();
      diag('Following redirect', { from: url, to: nextUrl, status: res.status });
      res = await fetch(nextUrl, {
        method: 'POST',
        headers,
        body,
      });
    }
  }
  return res;
}

async function exchangeToken(code: string, WHOP_CLIENT_ID: string, WHOP_CLIENT_SECRET: string, BASE_URL: string) {
  const redirectUri = `${BASE_URL}/api/whop/install`;
  const diagnostics: any[] = [];

  for (const endpoint of WHOP_TOKEN_ENDPOINTS) {
    // Variant A: BODY
    try {
      const bodyForm = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: WHOP_CLIENT_ID,
        client_secret: WHOP_CLIENT_SECRET,
      });
      const headersA = { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' };
      const resA = await postForm(endpoint, bodyForm, headersA);
      const textA = await resA.text();
      let jsonA: any = null;
      try { jsonA = JSON.parse(textA); } catch {}

      diagnostics.push({
        attempt: 'Token Exchange (body)',
        endpoint,
        status: resA.status,
        headers: Object.fromEntries(Array.from(resA.headers.entries()).slice(0, 15)),
        rawBody: (textA || '').slice(0, 600),
        error: resA.ok ? undefined : 'HTTP not ok',
      });

      if (resA.ok && jsonA?.access_token) {
        return { ok: true as const, token: jsonA, diagnostics };
      }
    } catch (e: any) {
      diagnostics.push({
        attempt: 'Token Exchange (body) (exception)',
        endpoint,
        status: 0,
        headers: {},
        rawBody: "",
        error: String(e?.message || e),
      });
    }
  }
  return { ok: false as const, diagnostics };
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

  const WHOP_CLIENT_ID = process.env.WHOP_CLIENT_ID;
  const WHOP_CLIENT_SECRET = process.env.WHOP_CLIENT_SECRET;
  const BASE_URL = process.env.WHOP_REDIRECT_URI ?
    new URL(process.env.WHOP_REDIRECT_URI).origin : // Use the origin from WHOP_REDIRECT_URI if set
    'https://whop-dms.vercel.app'; // Fallback for redirect_uri base.

  if (!WHOP_CLIENT_ID || !WHOP_CLIENT_SECRET) {
    console.error("[WHOP_INSTALL] Missing required environment variables: WHOP_CLIENT_ID or WHOP_CLIENT_SECRET");
    return res.status(500).json({
      ok: false,
      reason: "server_config_error",
      diagnostics: [{ endpoint: "Env Check", status: 500, headers: {}, rawBody: "Missing credentials",
        error: "Missing WHOP_CLIENT_ID or WHOP_CLIENT_SECRET" }],
    });
  }

  const result = await exchangeToken(code, WHOP_CLIENT_ID, WHOP_CLIENT_SECRET, BASE_URL);
  diag('token exchange result', result); // Use diag here as well

  if (!result.ok) {
    console.error('[WHOP_INSTALL] token exchange result', result.diagnostics); // Log diagnostics on failure
    return res.status(500).json({
      ok: false,
      reason: 'token_exchange_failed',
      diagnostics: result.diagnostics,
    });
  }

  // After obtaining access_token, call Whop “/me” to verify:
  const { access_token, token_type } = result.token;
  const meRes = await fetch('https://whop.com/api/v2/me', {
    headers: { Authorization: `${token_type} ${access_token}`, Accept: 'application/json' },
  });
  const meText = await meRes.text();
  let me: any = null;
  try { me = JSON.parse(meText); } catch {}
  diag('me result', { status: meRes.status, body: (meText || '').slice(0, 600) });

  if (meRes.ok && me) {
    return res.status(200).json({ ok: true, me });
  } else {
    // On error, include { ok: true, tokenVerified: false } but still return 200
    console.error('[WHOP_INSTALL] /me verification failed', { status: meRes.status, body: meText });
    return res.status(200).json({ ok: true, tokenVerified: false });
  }
}
