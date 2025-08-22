import type { NextApiRequest, NextApiResponse } from "next";

// --- Response Types ---
type SuccessResponse = {
  ok: true;
  meStatus: number;
  me: any;
};

type ErrorResponse = {
  ok: false;
  reason: string;
  diagnostics: ExchangeDiag[];
};

type ExchangeDiag = {
  attempt: string;
  status: number;
  headers: Record<string, string>;
  rawBody: string;
  error?: string;
};

function b64(s: string) {
  return Buffer.from(s, 'ascii').toString('base64');
}

function toForm(body: Record<string, string>) {
  return new URLSearchParams(body).toString();
}

async function postForm(url: string, form: Record<string, string>, extraHeaders?: HeadersInit) {
  const body = new URLSearchParams(form);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      ...extraHeaders,
    },
    body,
  });
}

const TOKEN_URL = "https://whop.com/api/v2/oauth/token";

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<
  | { ok: true; token: any; diagnostics: ExchangeDiag[] }
  | { ok: false; diagnostics: ExchangeDiag[] }
> {
  const diagnostics: ExchangeDiag[] = [];

  // prefer body params (recommended)
  const form = {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: process.env.WHOP_CLIENT_ID ?? "",
    client_secret: process.env.WHOP_CLIENT_SECRET ?? "",
  };

  try {
    // 1) direct POST to absolute URL
    let res = await postForm(TOKEN_URL, form);
    if (res.status === 308 || res.status === 307 || res.status === 301 || res.status === 302) {
      // follow redirect using absolute URL (if Location is relative)
      const loc = res.headers.get("location") ?? "";
      const nextUrl = new URL(loc, TOKEN_URL).toString();
      res = await postForm(nextUrl, form);
    }

    const text = await res.text();
    diagnostics.push({
      attempt: "Token Exchange (body)",
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      rawBody: text,
      error: res.ok ? undefined : "HTTP not ok",
    });

    if (res.ok) {
      const json = JSON.parse(text);
      return { ok: true, token: json, diagnostics };
    }
  } catch (e: any) {
    diagnostics.push({
      attempt: "Token Exchange (body) (Network Error)",
      status: 0,
      headers: {},
      rawBody: "",
      error: e?.message ?? String(e),
    });
  }

  // 2) fallback: HTTP Basic (also allowed) with only code+redirect_uri in body
  try {
    const basic = Buffer.from(
      `${process.env.WHOP_CLIENT_ID ?? ""}:${process.env.WHOP_CLIENT_SECRET ?? ""}`,
      "ascii"
    ).toString("base64");

    const res = await postForm(
      TOKEN_URL,
      { grant_type: "authorization_code", code, redirect_uri: redirectUri },
      { Authorization: `Basic ${basic}` }
    );
    const text = await res.text();
    diagnostics.push({
      attempt: "Token Exchange (basic)",
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      rawBody: text,
      error: res.ok ? undefined : "HTTP not ok",
    });

    if (res.ok) {
      const json = JSON.parse(text);
      return { ok: true, token: json, diagnostics };
    }
  } catch (e: any) {
    diagnostics.push({
      attempt: "Token Exchange (basic) (Network Error)",
      status: 0,
      headers: {},
      rawBody: "",
      error: e?.message ?? String(e),
    });
  }

  return { ok: false, diagnostics };
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
  const redirect_uri = process.env.WHOP_REDIRECT_URI ?? `${process.env.APP_BASE_URL}/api/whop/install`;

  if (!client_id || !client_secret) {
    console.error("[WHOP_INSTALL] Missing required environment variables: WHOP_CLIENT_ID or WHOP_CLIENT_SECRET");
    return res.status(500).json({
      ok: false,
      reason: "server_config_error",
      diagnostics: [{ attempt: "Env Check", status: 500, headers: {}, rawBody: "Missing credentials",
        error: "Missing WHOP_CLIENT_ID or WHOP_CLIENT_SECRET" }],
    });
  }

  const result = await exchangeCodeForToken(code, redirect_uri);

  console.log("[WHOP_INSTALL] exchange result", JSON.stringify(result, null, 2));

  if (!result.ok) {
    console.error("[WHOP_INSTALL] Token exchange error:", result);
    return res.status(500).json({ ok: false, reason: "token_exchange_failed", diagnostics: result.diagnostics });
  }

  // If you want, verify the token by calling /me (optional):
  const meUrl = "https://whop.com/api/v2/me";
  const meRes = await fetch(meUrl, {
    headers: { Authorization: `Bearer ${result.token.access_token}` }
  });
  const meText = await meRes.text();
  
  let me: any;
  try {
    me = JSON.parse(meText);
  } catch {
    console.error("[WHOP_INSTALL] /me endpoint returned non-JSON:", meText);
    return res.status(500).json({
      ok: false,
      reason: "me_endpoint_non_json",
      diagnostics: [
        ...result.diagnostics,
        { attempt: "/me (JSON Parse Error)", status: meRes.status, headers: Object.fromEntries(meRes.headers.entries()), rawBody: meText, error: "Non-JSON response" }
      ]
    });
  }

  if (!meRes.ok) {
    console.error("[WHOP_INSTALL] /me endpoint call failed:", meText);
    return res.status(meRes.status).json({
      ok: false,
      reason: "me_endpoint_failed",
      diagnostics: [
        ...result.diagnostics,
        { attempt: "/me (API Error)", status: meRes.status, headers: Object.fromEntries(meRes.headers.entries()), rawBody: meText, error: me.error || "Unknown error" }
      ]
    });
  }

  // Return success (keep payload simple to satisfy types)
  return res.status(200).json({ ok: true, meStatus: meRes.status, me });
}
