import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code as string | undefined;

  if (!code) {
    return res.status(400).json({ ok: false, error: "Missing code" });
  }

  const redirectUri = `${process.env.APP_BASE_URL}/api/whop/install`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: process.env.WHOP_CLIENT_ID!,
    client_secret: process.env.WHOP_CLIENT_SECRET!,
  }).toString();

  try {
    const r = await fetch("https://api.whop.com/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const raw = await r.text();
    console.log("[WHOP TOKEN] status", r.status, raw);

    if (!r.ok) {
      return res.status(r.status).json({ ok: false, error: "Token exchange failed", rawResponse: raw });
    }

    let json: any;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({ ok: false, error: "Failed to parse token response from Whop", rawResponse: raw });
    }

    if (!json.access_token) {
      return res.status(500).json({ ok: false, error: "No access_token in response", rawResponse: json });
    }

    return res.status(200).json({ ok: true, token: json.access_token, raw: json });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
