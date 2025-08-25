import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSupabase } from '../../lib/supabaseServer';
import { verifyToken, TokenPayload } from 'lib/token'; // Assuming verifyToken is still used

type Data = { success: boolean; message?: string; error?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // get bearer token from header or cookie
  const auth = req.headers.authorization ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const cookieToken = (req.cookies && (req.cookies['token'] || req.cookies['x-token'])) || '';
  const token = bearer || cookieToken;

  // now verify using the token string
  const payload = (await verifyToken(token)) as TokenPayload | null;
  if (!payload) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { community_id, answers } = req.body;

  if (!community_id || !answers) {
    return res.status(400).json({ success: false, error: 'Community ID and answers are required.' });
  }

  try {
    const supabase = getServerSupabase();
    const { error } = await supabase.from('answers').insert({
      community_id,
      member_id: payload.memberId, // Assuming memberId is in the token payload
      ...answers,
    });

    if (error) {
      console.error('Supabase insert error:', error);
      throw new Error(error.message);
    }

    return res.status(200).json({ success: true, message: 'Answers saved successfully!' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'An unexpected error occurred.' });
  }
}

