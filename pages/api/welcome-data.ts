import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from 'lib/token';
import { supabase } from '../../lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Token is required.' });
  }

  const payload = verifyToken(token);

  if (!payload.ok) {
    return res.status(401).json({ message: `Invalid or expired token: ${payload.reason}.` });
  }

  const communityId = (payload.data as any).community_id ?? (payload.data as any).communityId;
  const memberId = (payload.data as any).member_id ?? (payload.data as any).memberId;

  if (!communityId || !memberId) {
    return res.status(200).json({ ok: false, reason: 'missing ids', keys: Object.keys(payload.data) });
  }

  // Fetch questions from settings table based on communityId
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


