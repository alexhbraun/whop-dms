import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../lib/token';
import { supabase } from '../../lib/supabaseServer';

const WHOP_WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { token, email, q1_response, q2_response, q3_response } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Token is required.' });
  }

  const payload = verifyToken(token, WHOP_WEBHOOK_SECRET);

  if (!payload.ok) {
    return res.status(401).json({ message: `Invalid or expired token: ${payload.reason}.` });
  }

  const { memberId, communityId, memberName } = payload.data;

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
