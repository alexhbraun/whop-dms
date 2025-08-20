// /pages/api/whop/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseServer';
import { verifyWhopSignature, readRawBody } from '../../../lib/whop';

// Needed to access raw body for HMAC
export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Secret from env (allow either name)
  const secret =
    process.env.WHOP_WEBHOOK_SECRET ||
    process.env.WHOP_SIGNING_SECRET ||
    '';

  if (!secret) {
    console.error('Webhook: no secret configured. Expected WHOP_WEBHOOK_SECRET or WHOP_SIGNING_SECRET');
    return res.status(500).json({ ok: false, error: 'no webhook secret configured' });
  }

  // Get raw body for HMAC
  const rawBody = await readRawBody(req);

  // Try common header names
  const headerSig =
    (req.headers['x-whop-signature'] as string) ||
    (req.headers['whop-signature'] as string) ||
    (req.headers['x-signature'] as string) ||
    '';

  // Verify
  const ok = await verifyWhopSignature(rawBody, headerSig, secret);
  if (!ok) {
    console.error('Webhook sig invalid', {
      headerName: (req.headers['x-whop-signature'] && 'x-whop-signature') ||
                  (req.headers['whop-signature'] && 'whop-signature') ||
                  (req.headers['x-signature'] && 'x-signature') || 'none',
      headerLen: (headerSig || '').length,
      bodyLen: rawBody.length,
      bodyPrefix: rawBody.slice(0, 30)
    });
    return res.status(401).json({ ok:false, error:'invalid signature' });
  }

  // Parse verified payload
  let evt: any = {};
  try { evt = JSON.parse(rawBody); } catch { return res.status(400).json({ error: 'invalid json' }); }

  // Event type: prefer `action`, then `type`, then `event`/`name`
  const eventType =
    (evt?.action as string) ||
    (evt?.type as string) ||
    (evt?.event as string) ||
    (evt?.name as string) ||
    'unknown';

  // Community ID from several possible spots
  const communityId =
    (evt as any)?.community_id ??
    (evt as any)?.company_id ??
    (evt as any)?.biz_id ??
    (evt as any)?.business_id ??
    (evt as any)?.data?.community_id ??
    (evt as any)?.data?.company_id ??
    (evt as any)?.membership?.company?.id ??
    (evt as any)?.membership?.community?.id ??
    null;

  // Optional metadata
  const creatorEmail =
    (evt as any)?.creator_email ??
    (evt as any)?.data?.creator_email ??
    (evt as any)?.user?.email ??
    null;

  const plan =
    (evt as any)?.plan ??
    (evt as any)?.data?.plan ??
    null;

  // Log the event (store payload JSONB too)
  await supabase.from('webhook_events').insert({
    event_type: eventType,
    community_id: communityId,
    payload: evt,
  });

  // Activate on install/membership valid IF we have a communityId
  const activate = [
    'app.installed',
    'app_membership.went_valid',
    'app_membership_went_valid',
  ];
  if (communityId && activate.includes(eventType)) {
    await supabase.from('installations').upsert(
      { community_id: communityId, creator_email: creatorEmail, plan, active: true },
      { onConflict: 'community_id' }
    );
  }

  // Deactivate on uninstall/membership invalid IF we have a communityId
  const deactivate = [
    'app.uninstalled',
    'app_membership.cancel_at_period_end_changed',
    'app_membership_went_invalid',
  ];
  if (communityId && deactivate.includes(eventType)) {
    await supabase.from('installations')
      .update({ active: false })
      .eq('community_id', communityId);
  }

  // optional: debug line (safe)
  console.log('Webhook parsed', { eventType, hasCommunityId: !!communityId });

  return res.status(200).json({ ok: true });
}
