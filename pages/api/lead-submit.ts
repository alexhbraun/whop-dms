import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, TokenPayload } from 'lib/token';
import { supabase } from '../../lib/supabaseServer';

interface LeadPayload extends TokenPayload {
  memberId: string;
  communityId: string;
  memberName?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

  const { memberId, communityId, memberName } = (payloadResult.data as LeadPayload);

  // Fetch member_name from Whop API if needed, or assume it's passed or stored elsewhere
  // For now, we'll use a placeholder or assume it's not strictly needed here for leads table
  // let memberName = null; // Can be fetched later or passed via token if needed

  try {
    const { data: leadsData, error: insertError } = await supabase.from('leads').insert({
      community_id: communityId,
      member_id: memberId,
      member_name: memberName, // Placeholder
      email,
      q1_response,
      q2_response,
      q3_response,
    });

    if (insertError) {
      console.error('Error inserting lead:', insertError);
      return res.status(500).json({ message: 'Error saving lead.', details: insertError.message });
    }

    res.status(200).json({ message: 'Lead submitted successfully.' });
  } catch (error) {
    console.error('Exception while submitting lead:', error);
    res.status(500).json({ message: 'Internal server error while submitting lead.' });
  }
}
