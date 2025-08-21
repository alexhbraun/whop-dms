// pages/api/whop/install.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { whopConfig, logWhopConfigSummary } from "../../../lib/whopConfig";
import { logEvent } from "../../../lib/log";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const log = (...args: any[]) => {
  try {
    // Make logs easy to find in Vercel
    console.log("[WHOP-INSTALL]", ...args);
  } catch {}
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  logWhopConfigSummary();
  const whopRedirectUri = `${whopConfig.APP_BASE_URL}/api/whop/install`;
  log("hit", { method: req.method, fullUrl: req.url, query: req.query, whopRedirectUri });

  // 1. Basic validation and debugging
  if (req.query?.debug === "1") {
    return res.status(200).json({
      ok: true,
      debug: true,
      message: "Debug echo for /api/whop/install",
      query: req.query,
      headers: req.headers,
    });
  }

  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  if (!code) {
    return res.status(400).json({ ok: false, error: "Missing 'code' parameter in OAuth callback." });
  }

  if (!whopConfig.WHOP_CLIENT_ID || !whopConfig.WHOP_CLIENT_SECRET) {
    console.error("[WHOP-INSTALL] Missing required environment variables: WHOP_CLIENT_ID or WHOP_CLIENT_SECRET");
    return res.status(500).json({ ok: false, error: "Server configuration error: Missing Whop API credentials." });
  }

  try {
    // 1) Exchange `code` → tokens
    const tokenResponse = await fetch(`${whopConfig.WHOP_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: whopRedirectUri,
        client_id: whopConfig.WHOP_CLIENT_ID,
        client_secret: whopConfig.WHOP_CLIENT_SECRET,
      }).toString(),
    });

    let tokenData: any;
    const rawResponseText = await tokenResponse.text();

    try {
      tokenData = JSON.parse(rawResponseText);
    } catch (parseError) {
      console.error("[WHOP-INSTALL] Failed to parse token response JSON:", parseError);
      console.error("[WHOP-INSTALL] Raw token response:", rawResponseText);
      return res.status(500).json({
        ok: false,
        error: "Failed to parse token response from Whop. API returned non-JSON.",
        rawResponse: rawResponseText,
      });
    }

    if (!tokenResponse.ok) {
      console.error("[WHOP-INSTALL] OAuth exchange failed:", tokenResponse.status, tokenData);
      return res.status(tokenResponse.status).json({
        ok: false,
        error: "Failed to exchange code for tokens.",
        details: tokenData?.error_description || tokenData?.error || "Unknown error",
        rawResponse: rawResponseText,
      });
    }

    log("token-exchange-ok", { tokenData: { access_token_preview: tokenData.access_token?.substring(0, 5) + '...' } });

    // 4) On success: return JSON with preview of access token when 'debug' is set
    if (req.query?.debug === "1") {
      return res.status(200).json({
        ok: true,
        message: "OAuth exchange successful (debug mode).",
        accessTokenPreview: tokenData.access_token ? tokenData.access_token.substring(0, 10) + '...' : 'N/A',
        scope: tokenData.scope,
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
      });
    }

    // Otherwise redirect to /dashboard?installed=1
    res.redirect(302, `/dashboard?installed=1`);
    return;

  } catch (err: any) {
    console.error("[WHOP-INSTALL] Unhandled error during OAuth flow:", err);
    return res.status(500).json({ ok: false, error: "Internal server error during OAuth flow.", details: err?.message || String(err) });
  }
}
