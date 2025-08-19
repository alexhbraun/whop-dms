import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken } from 'lib/token'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = (req.query.token as string) || (req.body?.token as string)
    if (!token) return res.status(400).json({ ok:false, error:'no token' })
    const payload = verifyToken(token)
    return res.status(200).json({ ok:true, keys: Object.keys(payload || {}), payload })
  } catch (e:any) {
    return res.status(200).json({ ok:false, error:e?.message || 'verify failed' })
  }
}




