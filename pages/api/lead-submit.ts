// /pages/api/lead-submit.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, TokenPayload } from 'lib/token';
import { supabase } from '../../lib/supabaseServer';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

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

  if (!communityId) {
    return res.status(400).json({ error: 'Token missing community ID' });
  }

  // Fetch installation settings
  const { data: installation, error: installError } = await supabaseAdmin.from('installations')
    .select('settings')
    .eq('community_id', communityId)
    .single();

  if (installError && installError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error fetching installation settings:', installError);
    return res.status(500).json({ message: 'Error fetching installation settings.', details: installError.message });
  }

  const settings = (installation?.settings || {}) as { requireEmail?: boolean; forwardWebhookUrl?: string };

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

  // Enforce settings (e.g., require email)
  if (settings.requireEmail && (!email || email.trim() === '')) {
    return res.status(400).json({ message: 'Email is required for this community.' });
  }

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

    // Forward to webhook URL if configured (non-blocking)
    if (settings.forwardWebhookUrl) {
      const forwardPayload = {
        community_id: communityId,
        member_id: memberId,
        member_name: memberName,
        email,
        q1_response,
        q2_response,
        q3_response,
        source: 'whop-lead-form',
        timestamp: new Date().toISOString(),
      };

      fetch(settings.forwardWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forwardPayload),
      })
        .then(response => {
          if (!response.ok) {
            console.warn(`Failed to forward lead to webhook (${response.status}): ${settings.forwardWebhookUrl}`);
          }
        })
        .catch(err => {
          console.error(`Error forwarding lead to webhook (${settings.forwardWebhookUrl}):`, err);
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
