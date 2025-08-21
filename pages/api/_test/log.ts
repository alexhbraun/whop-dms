import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[test/log] HIT', { method: req.method, q: req.query, ua: req.headers['user-agent'] });
  console.error('[test/log] SAMPLE_ERROR_LINE for visibility');
  return res.status(200).json({ ok: true, now: new Date().toISOString() });
}
