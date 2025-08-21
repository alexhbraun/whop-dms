// pages/api/lead-submit.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, type TokenPayload } from 'lib/token';
import { supabase } from '../../lib/supabaseServer';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

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

  const { email, memberId } = (req.body ?? {}) as { email?: string; memberId?: string };
  if (!email || !memberId) return res.status(400).json({ ok: false, error: 'missing fields' });

  // …do your Supabase writes with supabaseAdmin…

  return res.json({ ok: true });
}
