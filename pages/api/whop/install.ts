// pages/api/whop/install.ts
import type { NextApiRequest, NextApiResponse } from "next";

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

    console.log("WHOP_INSTALL success-path", { code, biz, state });
    return res.status(200).json({ ok: true, received: { code, biz, state } });
  } catch (err) {
    console.error("WHOP_INSTALL error", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
