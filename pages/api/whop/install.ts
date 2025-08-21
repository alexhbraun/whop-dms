// pages/api/whop/install.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // --- BEGIN DEBUG CAPTURE ---
  const fwdHost = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
  const fwdProto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const fullUrl = (() => {
    try {
      return new URL(req.url || '', `${fwdProto}://${fwdHost}`).toString();
    } catch {
      return `${fwdProto}://${fwdHost}${req.url || ''}`;
    }
  })();
  // --- END DEBUG CAPTURE ---

  if (req.query?.debug === '1') {
    console.log('[INSTALL DEBUG] hit /api/whop/install', {
      fullUrl,
      method: req.method,
      query: req.query,
      headers: req.headers,
    });
    res.status(200).json({
      message: 'Debug echo for /api/whop/install',
      sawCode: typeof req.query.code === 'string',
      sawBiz: typeof req.query.biz === 'string',
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-host': req.headers['x-forwarded-host'],
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        host: req.headers['host'],
      },
    });
    return;
  }
  try {
    const { method, url, query, headers } = req;
    const code = typeof query.code === "string" ? query.code : undefined;
    const biz = typeof query.biz === "string" ? query.biz : undefined;
    const state = typeof query.state === "string" ? query.state : undefined;

    console.log("WHOP_INSTALL start", {
      method, url, query,
      hdr: {
        ua: headers["user-agent"],
        xfhost: headers["x-forwarded-host"],
        xfproto: headers["x-forwarded-proto"],
        vercel: headers["x-vercel-deployment-url"],
      },
    });

    if (query.debug === "1") {
      return res.status(200).json({
        ok: true,
        message: "Debug echo for /api/whop/install",
        sawCode: !!code,
        sawBiz: !!biz,
        query,
        headers: {
          "user-agent": headers["user-agent"],
          "x-forwarded-host": headers["x-forwarded-host"],
          "x-forwarded-proto": headers["x-forwarded-proto"],
          "x-vercel-deployment-url": headers["x-vercel-deployment-url"],
        },
      });
    }

    if (!code) {
      return res.status(400).json({
        error: "Missing code",
        hint: "This endpoint must be called by Whop after the install auth step with ?code=...&biz=...",
      });
    }

    console.log("WHOP_INSTALL success-path", { code, biz, state });
    return res.status(200).json({ ok: true, received: { code, biz, state } });
  } catch (err) {
    console.error("WHOP_INSTALL error", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
