import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { whopConfig } from '../../lib/whopConfig';
import { verifyToken, type TokenPayload } from 'lib/token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // get bearer token from header or cookie
  const auth = req.headers.authorization ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const cookieToken = (req.cookies && (req.cookies['token'] || req.cookies['x-token'])) || '';
  const token = bearer || cookieToken;

  // now verify using the token string
  const payload = (await verifyToken(token)) as TokenPayload | null;
  if (!payload) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const { memberId, answers } = req.body ?? {};
  if (!memberId || !Array.isArray(answers)) return res.status(400).json({ ok: false, error: 'bad input' });

  const { error } = await supabaseAdmin.from('answers').insert({
    member_id: memberId,
    answers,
    biz_id: payload.bizId ?? null,
  });

  if (error) return res.status(500).json({ ok: false, error: error.message });

  return res.status(200).json({ ok: true, base: whopConfig.APP_BASE_URL });
}

