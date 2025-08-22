import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const id = process.env.WHOP_CLIENT_ID;
  const sec = process.env.WHOP_CLIENT_SECRET;
  const ru = process.env.WHOP_REDIRECT_URI;
  res.json({
    ok: true,
    WHOP_CLIENT_ID: id ? id.slice(0,4) + "…" : null,
    WHOP_CLIENT_SECRET: sec ? true : false,
    WHOP_REDIRECT_URI: ru || null,
  });
}
