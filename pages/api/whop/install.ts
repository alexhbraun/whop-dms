// pages/api/whop/install.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { WHOP_API_BASE, APP_BASE_URL } from "../../lib/whopConfig";
import { logEvent } from "../../lib/log";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

const log = (...args: any[]) => {
  try {
    // Make logs easy to find in Vercel
    console.log("[WHOP-INSTALL]", ...args);
  } catch {}
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method;
  const fwdProto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  const fwdHost = req.headers.host || '';
  const fullUrl = `${fwdProto}://${fwdHost}${req.url}`;
  log("hit", { method, fullUrl, query: req.query });

  if (req.query?.debug === "1") {
    return res.status(200).json({
      ok: true,
      debug: true,
      method,
      fullUrl,
      query: req.query,
      headers: {
        "x-forwarded-host": req.headers["x-forwarded-host"],
        "x-forwarded-proto": req.headers["x-forwarded-proto"],
        "x-vercel-deployment-url": req.headers["x-vercel-deployment-url"],
      },
    });
  }

  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  const biz = typeof req.query.biz === "string" ? req.query.biz : (typeof req.query.biz_id === "string" ? req.query.biz_id : undefined);

  log("params", { code: !!code, state: !!state, biz });

  if (!code) {
    res.status(400).send(`<pre>Missing ?code in callback\nURL: ${req.url}\nQuery: ${JSON.stringify(req.query, null, 2)}</pre>`);
    return;
  }

  try {
    // 1) Exchange `code` → tokens
    const client_id = process.env.WHOP_CLIENT_ID;
    const client_secret = process.env.WHOP_CLIENT_SECRET;

    if (!client_id || !client_secret) {
      logEvent("/api/whop/install", "error", "env-vars-missing", { code, client_id: !!client_id, client_secret: !!client_secret });
      return res.status(500).json({ error: "Server missing WHOP_CLIENT_ID or WHOP_CLIENT_SECRET" });
    }

    const tokenResponse = await fetch(`${WHOP_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: `${APP_BASE_URL}/api/whop/install`,
        client_id: client_id,
        client_secret: client_secret,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      logEvent("/api/whop/install", "error", "oauth-exchange-failed", { code, tokenData });
      return res.status(tokenResponse.status).json({ error: "Failed to exchange code for tokens", details: tokenData });
    }

    log("token-exchange-ok", { tokenData });

    const accessToken = tokenData.access_token;
    let creatorEmail = tokenData.creator_email; // May be present in token response
    let communityId = tokenData.community_id; // May be present in token response

    // 2) Using the `access_token`, call `${WHOP_API_BASE}/v5/me` (or `/me`) to fetch the creator profile (id/email).
    if (!creatorEmail || !communityId) {
      const meResponse = await fetch(`${WHOP_API_BASE}/v5/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const meData = await meResponse.json();

      if (!meResponse.ok) {
        logEvent("/api/whop/install", "error", "fetch-me-failed", { code, meData });
        return res.status(meResponse.status).json({ error: "Failed to fetch creator profile", details: meData });
      }
      creatorEmail = meData.email;
      communityId = meData.community_id; // Still might be undefined
      log("me-fetch-ok", { meData });
    }

    // 3) Try to resolve the install’s company/community/experience:
    let settingsNeedsResolution = false;
    if (!communityId) {
      communityId = `pending_${Date.now()}`;
      settingsNeedsResolution = true;
    }

    // 4) Upsert to `installations`:
    const { data, error } = await supabaseAdmin
      .from("installations")
      .upsert(
        {
          community_id: communityId,
          creator_email: creatorEmail,
          active: true,
          plan: "default",
          settings: {
            auth: tokenData,
            needs_resolution: settingsNeedsResolution,
          },
        },
        { onConflict: "community_id" }
      );

    if (error) {
      logEvent("/api/whop/install", "error", "db-upsert-failed", { code, creatorEmail, communityId, error });
      return res.status(500).json({ error: "Failed to save installation data", details: error.message });
    }

    // 5) Log with `logEvent('/api/whop/install','info','oauth-exchange-ok', {code, creator_email, community_id})`
    logEvent("/api/whop/install", "info", "oauth-exchange-ok", { code, creator_email: creatorEmail, community_id: communityId });

    // 6) Redirect 302 to `/app?installed=1&community_id=<id>` (or `/dashboard?installed=1`)
    res.redirect(302, `/app?installed=1&community_id=${communityId}`);
    return;
  } catch (err) {
    console.error("WHOP_INSTALL error", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
