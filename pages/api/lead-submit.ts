// /pages/api/lead-submit.ts
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

  // --- robust token extraction (works on Vercel + Node) ---
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
  // --- end token extraction ---

  if (!token) {
    return res.status(400).json({ ok: false, error: 'no token' });
  }

  const payloadResult = verifyToken(token);

  if (!payloadResult.ok) {
    // ✅ fixed: use backticks for template string
    return res.status(401).json({
      message: `Invalid or expired token: ${payloadResult.reason}.`,
    });
  }

  const { memberId, communityId, memberName } = payloadResult.data as LeadPayload;

  // ✅ declare/parse body fields BEFORE using them
  const {
    email,
    q1_response,
    q2_response,
    q3_response,
  } = (req.body ?? {}) as {
    email?: string;
    q1_response?: string;
    q2_response?: string;
    q3_response?: string;
  };

  try {
    const { data: leadsData, error: insertError } = await supabase.from('leads').insert({
      community_id: communityId,
      member_id: memberId,
      member_name: memberName ?? null,
      // ✅ explicit mapping; no undeclared shorthand
      email: email ?? null,
      q1_response: q1_response ?? null,
      q2_response: q2_response ?? null,
      q3_response: q3_response ?? null,
    });

    if (insertError) {
      console.error('Error inserting lead:', insertError);
      return res.status(500).json({
        message: 'Error saving lead.',
        details: insertError.message,
      });
    }

    return res.status(200).json({ message: 'Lead submitted successfully.' });
  } catch (error) {
    console.error('Exception while submitting lead:', error);
    return res.status(500).json({
      message: 'Internal server error while submitting lead.',
    });
  }
}
