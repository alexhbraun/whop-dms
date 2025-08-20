// /pages/api/whop/install.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import supabaseAdmin from '../../../lib/supabaseAdmin'; // Import supabaseAdmin
import { verifyWhopSignature } from '../../../lib/whop'; // Corrected import
import { verifyToken } from '../../../lib/token'; // Corrected import

// raw-body required for HMAC verification
export const config = { api: { bodyParser: false } };

async function readRaw(req: NextApiRequest) {
  const chunks: Uint8Array[] = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const signingSecret = process.env.WHOP_SIGNING_SECRET || '';
  try {
    const raw = await readRaw(req);

    let community_id: string | undefined;
    let creator_email: string | undefined;
    let plan: string | undefined;

    // Prefer JWT token in body if present
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

    if (typeof body?.token === 'string') {
      const v = verifyToken(body.token);
      if (!v.ok) return res.status(401).json({ error: 'invalid token' });
      const d: any = v.data;
      community_id = d.community_id ?? d.communityId;
      creator_email = d.creator_email ?? d.email;
      plan = d.plan;
    } else {
      // Verify HMAC header from Whop
      const sig = req.headers['x-whop-signature'] as string | undefined;
      // The verifyWhopSignature function now expects rawBodyContent: string, signature: string | undefined, secret: string
      if (!verifyWhopSignature(raw, sig, signingSecret)) {
        return res.status(401).json({ error: 'invalid signature' });
      }
      const d = body?.data ?? body;
      community_id = d?.community_id;
      creator_email = d?.creator_email ?? d?.email;
      plan = d?.plan;
    }

    if (!community_id) return res.status(400).json({ error: 'missing community_id' });

    const { error } = await supabaseAdmin.from('installations').upsert(
      { 
        community_id,
        creator_email: creator_email ?? null,
        plan: plan ?? null,
        active: true,
      },
      { onConflict: 'community_id' }
    );

    if (error) return res.status(500).json({ error: 'db error', details: error.message });
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('whop install error', e);
    return res.status(500).json({ error: 'server error', details: String(e?.message || e) });
  }
}
