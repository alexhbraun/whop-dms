import type { NextApiRequest, NextApiResponse } from "next";

const WHOP_TOKEN_URL = 'https://api.whop.com/api/v2/oauth/token';

const WHOP_CLIENT_ID = process.env.WHOP_CLIENT_ID!;
const WHOP_CLIENT_SECRET = process.env.WHOP_CLIENT_SECRET!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://whop-dms.vercel.app';

function diag(label: string, data: any) {
  const safe = JSON.stringify(data, null, 2);
  console.log(`[WHOP_INSTALL] ${label}: ${safe.length > 1800 ? safe.slice(0, 1800) + '...<truncated>' : safe}`);
}

// --- Response Types ---
type SuccessResponse = {
  ok: true;
};

type ErrorResponse = {
  ok: false;
  reason: string;
  diagnostics: any[];
};

async function postForm(url: string, body: URLSearchParams, headers: HeadersInit) {
  // First attempt (BODY variant)
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

async function exchangeToken(code: string) {
  const redirectUri = `${BASE_URL}/api/whop/install`;

  const diagnostics: any[] = [];

  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: WHOP_CLIENT_ID,          // kept for BODY variant
    client_secret: WHOP_CLIENT_SECRET,  // kept for BODY variant
  });

  // Variant A: BODY
  try {
    const headersA = { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' };
    const resA = await postForm(WHOP_TOKEN_URL, form, headersA);
    const textA = await resA.text();
    let jsonA: any = null;
    try { jsonA = JSON.parse(textA); } catch {}
    diagnostics.push({
      attempt: 'Token Exchange (body)',
      status: resA.status,
      headers: Object.fromEntries(Array.from(resA.headers.entries()).slice(0, 20)),
      rawBody: (textA || '').slice(0, 500)
    });
    if (resA.ok && jsonA?.access_token) {
      return { ok: true as const, token: jsonA };
    }
  } catch (e: any) {
    diagnostics.push({ attempt: 'Token Exchange (body) (exception)', error: String(e?.message || e) });
  }

  // Variant B: BASIC (Authorization: Basic base64(client_id:client_secret))
  try {
    const basic = Buffer.from(`${WHOP_CLIENT_ID}:${WHOP_CLIENT_SECRET}`).toString('base64');
    const headersB = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': `Basic ${basic}`,
    };
    // Note: body excludes client_id/secret when using Basic (but leaving them is harmless).
    const formB = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
    const resB = await postForm(WHOP_TOKEN_URL, formB, headersB);
    const textB = await resB.text();
    let jsonB: any = null;
    try { jsonB = JSON.parse(textB); } catch {}
    diagnostics.push({
      attempt: 'Token Exchange (basic)',
      status: resB.status,
      headers: Object.fromEntries(Array.from(resB.headers.entries()).slice(0, 20)),
      rawBody: (textB || '').slice(0, 500)
    });
    if (resB.ok && jsonB?.access_token) {
      return { ok: true as const, token: jsonB };
    }
  } catch (e: any) {
    diagnostics.push({ attempt: 'Token Exchange (basic) (exception)', error: String(e?.message || e) });
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

  if (!WHOP_CLIENT_ID || !WHOP_CLIENT_SECRET) {
    console.error("[WHOP_INSTALL] Missing required environment variables: WHOP_CLIENT_ID or WHOP_CLIENT_SECRET");
    return res.status(500).json({
      ok: false,
      reason: "server_config_error",
      diagnostics: [{ attempt: "Env Check", status: 500, headers: {}, rawBody: "Missing credentials",
        error: "Missing WHOP_CLIENT_ID or WHOP_CLIENT_SECRET" }],
    });
  }

  const result = await exchangeToken(code);
  diag('exchange result', result);

  if (!result.ok) {
    return res.status(500).json({
      ok: false,
      reason: 'token_exchange_failed',
      diagnostics: result.diagnostics,
    });
  }

  // Optionally call /me with the access_token to verify
  const { access_token, token_type } = result.token;
  const meRes = await fetch('https://api.whop.com/api/v2/me', {
    headers: { Authorization: `${token_type} ${access_token}`, Accept: 'application/json' },
  });
  const meText = await meRes.text();
  let me: any = null; try { me = JSON.parse(meText); } catch {}
  diag('me result', { status: meRes.status, body: (meText || '').slice(0, 600) });

  return res.status(200).json({ ok: true });
}
