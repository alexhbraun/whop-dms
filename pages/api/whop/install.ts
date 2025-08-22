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

  // Build form body (x-www-form-urlencoded)
  const form = new URLSearchParams();
  form.set("grant_type", "authorization_code");
  form.set("code", code);
  form.set("redirect_uri", redirect_uri);
  form.set("client_id", client_id);
  form.set("client_secret", client_secret);

  // Basic auth (belt-and-suspenders; harmless if Whop doesn’t require it)
  const basic = Buffer.from(`${client_id}:${client_secret}`, "ascii").toString("base64");

  const url = "https://whop.com/api/v2/oauth/token";

  console.log("[WHOP_INSTALL] start", {
    state,
    redirect_uri,
    client_id: mask(client_id),
    hasSecret: !!client_secret,
    url
  });

  let text: string;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basic}`,
      },
      body: form.toString(),
    });
    text = await resp.text();
  } catch (e: any) {
    console.error("[WHOP_INSTALL] network error", e?.message || e);
    return res.status(502).json({ ok: false, error: "Network error contacting Whop token endpoint", details: String(e) });
  }

  // Try to parse JSON; if it fails, return the raw body for debugging
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    console.error("[WHOP_INSTALL] non-JSON token response", { status: resp.status, text });
    return res
      .status(502)
      .json({ ok: false, error: "Failed to parse token response from Whop (non‑JSON).", rawResponse: text ?? "" });
  }

  // If HTTP not OK, surface Whop error payload
  if (!resp.ok) {
    console.error("[WHOP_INSTALL] token exchange failed", { status: resp.status, body: json });
    return res.status(resp.status).json({
      ok: false,
      error: json?.error?.message || json?.message || "Token exchange failed",
      details: json
    });
  }

  const {
    access_token,
    token_type,
    expires_in,
    refresh_token,
    scope
  } = json || {};

  if (!access_token) {
    console.error("[WHOP_INSTALL] success response missing access_token", json);
    return res.status(502).json({ ok: false, error: "Whop response missing access_token", details: json });
  }

  // TODO: Persist token (Supabase etc.). For now, just echo success.
  console.log("[WHOP_INSTALL] success", {
    token_type,
    expires_in,
    scope,
    gotRefresh: !!refresh_token
  });

  return res.status(200).json({
    ok: true,
    access_token,
    token_type,
    expires_in,
    refresh_token,
    scope,
    raw: json
  });
}
