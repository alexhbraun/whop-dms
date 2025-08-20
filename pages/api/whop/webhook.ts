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

  const type = evt?.type as string | undefined;
  const community_id = evt?.data?.community_id ?? evt?.community_id ?? null;

  // Log webhook
  await supabase.from('webhook_events').insert({
    event_type: type ?? 'unknown',
    community_id,
    payload: evt,
  });

  // Handle uninstall
  if (type === 'app.uninstalled' && community_id) {
    await supabase.from('installations').update({ active: false }).eq('community_id', community_id);
  }

  return res.status(200).json({ ok: true });
}
