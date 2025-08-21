import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method, url, query, headers } = req;
    console.log("DEBUG_ECHO", {
      method, url, query,
      hdr: {
        ua: headers["user-agent"],
        xfhost: headers["x-forwarded-host"],
        xfproto: headers["x-forwarded-proto"],
        vercel: headers["x-vercel-deployment-url"],
      },
    });
    return res.status(200).json({
      ok: true,
      method,
      url,
      query,
      headers: {
        "user-agent": headers["user-agent"],
        "x-forwarded-host": headers["x-forwarded-host"],
        "x-forwarded-proto": headers["x-forwarded-proto"],
        "x-vercel-deployment-url": headers["x-vercel-deployment-url"],
      },
    });
  } catch (err) {
    console.error("DEBUG_ECHO error", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
