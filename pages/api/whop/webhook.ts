// /pages/api/whop/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
// ⛏️ fix relative paths (this file is deeper)
import { supabase } from '../../../lib/supabaseServer';
import { verifyWhopSignature } from '../../../lib/whop';

// Needed to access raw body for HMAC
export const config = { api: { bodyParser: false } };

async function readRaw(req: NextApiRequest) {
  const chunks: Uint8Array[] = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.WHOP_SIGNING_SECRET || '';
  const raw = await readRaw(req);
  const sig = req.headers['x-whop-signature'] as string | undefined;

  // ✅ correct signature: (rawBody, signatureHeader, secret)
  const ok = verifyWhopSignature(raw, sig, secret);
  if (!ok) return res.status(401).json({ error: 'invalid signature' });

  // Parse verified payload
  let evt: any = {};
  try { evt = JSON.parse(raw); } catch { return res.status(400).json({ error: 'invalid json' }); }

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
