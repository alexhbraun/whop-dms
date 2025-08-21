import type { NextApiRequest, NextApiResponse } from 'next';

const TOKEN_URL = 'https://api.whop.com/api/v2/oauth/token';

function required(name: string, v?: string) {
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method ?? 'GET';

  // We accept GET (Whop redirects with query) and POST (just in case)
  if (method !== 'GET' && method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const WHOP_CLIENT_ID    = required('WHOP_CLIENT_ID',     process.env.WHOP_CLIENT_ID);
    const WHOP_CLIENT_SECRET = required('WHOP_CLIENT_SECRET', process.env.WHOP_CLIENT_SECRET);

    // Build our redirect_uri exactly as registered in Whop dashboard
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || '';
    const redirectUri = `${baseUrl}/api/whop/install`;

    // Read params
    const code  = (req.query.code ?? (req.body && req.body.code)) as string | undefined;
    const state = (req.query.state ?? (req.body && req.body.state)) as string | undefined;

    console.log('[WHOP_INSTALL] hit', {
      method,
      fullUrl: req.url,
      query: req.query,
    });

    if (!code) {
      return res.status(400).json({ ok: false, error: 'missing_code' });
    }

    // Exchange code -> token (x-www-form-urlencoded)
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: WHOP_CLIENT_ID,
      client_secret: WHOP_CLIENT_SECRET,
    });

    const tokResp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: form.toString(),
    });

    const raw = await tokResp.text();
    console.log('[WHOP_INSTALL] token raw status/body', tokResp.status, raw);

    // If Whop ever returns non-JSON (e.g. empty string or HTML), catch it and return debuggable info
    let parsed: any = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      return res.status(502).json({
        ok: false,
        error: 'Failed to parse token response from Whop. API returned non-JSON.',
        rawResponse: raw,
        status: tokResp.status,
      });
    }

    // Handle non-200 with JSON body
    if (!tokResp.ok) {
      return res.status(tokResp.status).json({
        ok: false,
        error: parsed?.error || 'whop_token_exchange_failed',
        details: parsed,
      });
    }

    if (!parsed?.access_token) {
      return res.status(502).json({
        ok: false,
        error: 'missing_access_token_in_response',
        details: parsed,
      });
    }

    // (Optional) you can persist parsed.access_token / refresh_token with your DB here.
    console.log('[WHOP_INSTALL] token parsed summary', {
      has_access_token: !!parsed.access_token,
      token_type: parsed.token_type ?? null,
      scope: parsed.scope ?? null,
      state: state ?? null,
    });

    // Success response for now (E2E test)
    return res.status(200).json({
      ok: true,
      state: state ?? null,
      token_type: parsed.token_type ?? 'bearer',
      scope: parsed.scope ?? '',
      // do not echo the token itself in prod logs; returning short length only
      access_token_len: typeof parsed.access_token === 'string' ? parsed.access_token.length : 0,
    });
  } catch (err: any) {
    console.error('[WHOP_INSTALL] fatal error', err?.message, err?.stack);
    return res.status(500).json({ ok: false, error: 'internal_error', message: err?.message });
  }
}
