import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, TokenPayload } from 'lib/token';
import { getServerSupabase } from '../../lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Robust token extraction (works on Vercel + Node)
  const rawAuth =
    (Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization) ||
    (Array.isArray((req.headers as any)['x-authorization'])
      ? (req.headers as any)['x-authorization'][0]
      : (req.headers as any)['x-authorization']) ||
    (typeof req.query.token === 'string' ? req.query.token : '') ||
    (typeof (req.body as any)?.token === 'string' ? (req.body as any).token : '');

  const auth = typeof rawAuth === 'string' ? rawAuth : '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;

  if (!token) {
    return res.status(400).json({ ok: false, error: 'no token' });
  }
  // --- end standard token extraction ---

  const payloadResult = verifyToken(token);

  if (!payloadResult.ok) {
    return res.status(401).json({ message: `Invalid or expired token: ${payloadResult.reason}.` });
  }

  const communityId = (payloadResult.data as TokenPayload).community_id ?? (payloadResult.data as TokenPayload).communityId;
  const memberId = (payloadResult.data as TokenPayload).member_id ?? (payloadResult.data as TokenPayload).memberId;

  if (!communityId || !memberId) {
    return res.status(200).json({ ok: false, reason: 'missing ids', keys: Object.keys(payloadResult.data as TokenPayload) });
  }

  // Fetch questions from settings table based on communityId
  const supabase = getServerSupabase();
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('questions')
    .eq('community_id', communityId)
    .single();

  if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error fetching questions for welcome page:', settingsError);
    return res.status(500).json({ message: 'Error loading questions.' });
  }

  const questions = settings?.questions || [];

  res.status(200).json({ memberId, communityId, questions });
}


