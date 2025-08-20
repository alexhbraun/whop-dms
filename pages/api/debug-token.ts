import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken } from 'lib/token'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Robust token extraction (works on Vercel + Node)
  const rawAuth =
    (Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization) ||
    (typeof req.query.token === 'string' ? req.query.token : '') ||
    (typeof (req.body as any)?.token === 'string' ? (req.body as any).token : '');

  const auth = typeof rawAuth === 'string' ? rawAuth : '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;

  if (!token) {
    return res.status(400).json({ ok: false, error: 'no token' });
  }

  console.log('DEBUG headers.authorization =', req.headers.authorization);

  try {
    const payload = verifyToken(token);
    return res.status(200).json({ ok:true, keys: Object.keys(payload || {}), payload })
  } catch (e:any) {
    return res.status(200).json({ ok:false, error:e?.message || 'verify failed' })
  }
}




