import type { NextApiRequest, NextApiResponse } from "next";

type Ok = {
  ok: true;
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  raw?: any;
};

type Err = {
  ok: false;
  error: string;
  details?: any;
  rawResponse?: string;
};

function mask(v: string | undefined, keep = 4) {
  if (!v) return "";
  if (v.length <= keep) return "*".repeat(v.length);
  return v.slice(0, keep) + "…" + "*".repeat(Math.max(0, v.length - keep - 1));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const code = (req.query.code as string) || "";
  const state = (req.query.state as string) || "";

  const client_id = process.env.WHOP_CLIENT_ID || "";
  const client_secret = process.env.WHOP_CLIENT_SECRET || "";
  const redirect_uri = process.env.WHOP_REDIRECT_URI || "https://whop-dms.vercel.app/api/whop/install";

  if (!code) {
    return res.status(400).json({ ok: false, error: "Missing ?code on callback" });
  }
  if (!client_id || !client_secret) {
    return res.status(500).json({ ok: false, error: "Server missing WHOP_CLIENT_ID/WHOP_CLIENT_SECRET" });
  }

  // ===== TOKEN EXCHANGE =====
  const tokenUrl = 'https://whop.com/api/v2/oauth/token'; // NOTE: no api.whop.com
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri,
    client_id,
    client_secret,
  });

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const tokenText = await tokenRes.text();
  console.log('[WHOP_INSTALL] token status', tokenRes.status);
  console.log('[WHOP_INSTALL] token raw', tokenText?.slice(0, 400));

  let tokenJson: any = null;
  try {
    tokenJson = JSON.parse(tokenText);
  } catch {
    return res.status(502).json({
      ok: false,
      error: 'Token exchange returned non‑JSON from Whop.',
      rawResponse: tokenText,
    });
  }

  if (!tokenRes.ok || !tokenJson?.access_token) {
    return res.status(502).json({
      ok: false,
      error: 'Token exchange failed',
      details: tokenJson,
    });
  }

  const accessToken = tokenJson.access_token as string;

  // ===== PROVE TOKEN WORKS =====
  const meUrl = 'https://whop.com/api/v2/me';
  const meRes = await fetch(meUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meText = await meRes.text();
  console.log('[WHOP_INSTALL] /me status', meRes.status);
  console.log('[WHOP_INSTALL] /me raw', meText?.slice(0, 400));

  if (!meRes.ok) {
    return res.status(meRes.status).json({
      ok: false,
      error: 'Bearer call failed',
      details: meText,
    });
  }

  const me = JSON.parse(meText);

  // TODO: persist tokens + me as you already planned…
  return res.status(200).json({ ok: true, me });
}
