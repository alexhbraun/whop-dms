import type { NextApiRequest, NextApiResponse } from "next";

// --- Response Types ---
type SuccessResponse = {
  ok: true;
};

type ErrorResponse = {
  ok: false;
  reason: string;
  diagnostics: ExchangeDiag[];
};

const TOKEN_ENDPOINTS = [
  // 1) Canonical Doorkeeper path on API host (most likely)
  "https://api.whop.com/oauth/token",
  // 2) Same host with trailing slash
  "https://api.whop.com/oauth/token/",
  // 3) Legacy/canonical path on main host
  "https://whop.com/oauth/token",
  "https://whop.com/oauth/token/",
  // 4) Last resort: the api/v2 proxy (what we used before, often wrong)
  "https://whop.com/api/v2/oauth/token",
  "https://whop.com/api/v2/oauth/token/",
];

type ExchangeDiag = {
  endpoint: string;
  variant: "body" | "basic";
  status: number;
  headers: Record<string, string>;
  rawBody: string;
  note?: string;
  error?: string;
};

async function postFormAbs(url: string, form: Record<string, string>, headers?: HeadersInit) {
  const body = new URLSearchParams(form);
  let res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", ...headers },
    body,
    redirect: "manual",
  });

  // follow one manual redirect (e.g., 308) and normalize relative Location
  if ([301, 302, 307, 308].includes(res.status)) {
    const loc = res.headers.get("location") || "";
    const next = new URL(loc, url).toString();
    res = await fetch(next, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", ...headers },
      body,
    });
    return { res, followedTo: next };
  }
  return { res, followedTo: undefined as string | undefined };
}

async function tryOneEndpoint(endpoint: string, code: string, redirectUri: string): Promise<{
  ok: boolean;
  token?: any;
  diags: ExchangeDiag[];
}> {
  const diags: ExchangeDiag[] = [];
  const id = process.env.WHOP_CLIENT_ID ?? "";
  const secret = process.env.WHOP_CLIENT_SECRET ?? "";
  const form = { grant_type: "authorization_code", code, redirect_uri: redirectUri };

  // A) client_id + client_secret in body
  const bodyForm = { ...form, client_id: id, client_secret: secret };
  try {
    const { res, followedTo } = await postFormAbs(endpoint, bodyForm);
    const txt = await res.text();
    diags.push({
      endpoint: followedTo ?? endpoint,
      variant: "body",
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      rawBody: txt,
      note: followedTo ? `followed redirect from ${endpoint}` : undefined,
      error: res.ok ? undefined : "HTTP not ok",
    });
    if (res.ok) return { ok: true, token: JSON.parse(txt), diags };
  } catch (e: any) {
    diags.push({
      endpoint,
      variant: "body",
      status: 0,
      headers: {},
      rawBody: "",
      error: e?.message ?? String(e),
    });
  }

  // B) HTTP Basic; body without client credentials
  try {
    const basic = Buffer.from(`${id}:${secret}`, "ascii").toString("base64");
    const { res, followedTo } = await postFormAbs(endpoint, form, { Authorization: `Basic ${basic}` });
    const txt = await res.text();
    diags.push({
      endpoint: followedTo ?? endpoint,
      variant: "basic",
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      rawBody: txt,
      note: followedTo ? `followed redirect from ${endpoint}` : undefined,
      error: res.ok ? undefined : "HTTP not ok",
    });
    if (res.ok) return { ok: true, token: JSON.parse(txt), diags };
  } catch (e: any) {
    diags.push({
      endpoint,
      variant: "basic",
      status: 0,
      headers: {},
      rawBody: "",
      error: e?.message ?? String(e),
    });
  }

  return { ok: false, diags };
}

async function exchangeCodeForTokenMulti(code: string, redirectUri: string) {
  const all: ExchangeDiag[] = [];
  for (const ep of TOKEN_ENDPOINTS) {
    const r = await tryOneEndpoint(ep, code, redirectUri);
    all.push(...r.diags);
    if (r.ok) return { ok: true as const, token: r.token, endpoint: ep, diagnostics: all };
  }
  return { ok: false as const, diagnostics: all };
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
  const redirectUri = process.env.WHOP_REDIRECT_URI ?? `${process.env.APP_BASE_URL}/api/whop/install`;

  if (!client_id || !client_secret) {
    console.error("[WHOP_INSTALL] Missing required environment variables: WHOP_CLIENT_ID or WHOP_CLIENT_SECRET");
    return res.status(500).json({
      ok: false,
      reason: "server_config_error",
      diagnostics: [{ endpoint: "Env Check", variant: "body", status: 500, headers: {}, rawBody: "Missing credentials",
        error: "Missing WHOP_CLIENT_ID or WHOP_CLIENT_SECRET" }],
    });
  }

  const xr = await exchangeCodeForTokenMulti(code, redirectUri);

  console.log("[WHOP_INSTALL] exchange summary", JSON.stringify(xr, null, 2));

  if (!xr.ok) {
    return res.status(500).json({ ok: false, reason: "token_exchange_failed", diagnostics: xr.diagnostics });
  }

  // success
  return res.status(200).json({ ok: true });
}
