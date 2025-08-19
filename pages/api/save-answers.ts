import type { NextApiRequest, NextApiResponse } from 'next'
import * as jwt from 'jsonwebtoken'
import supabaseAdmin from '../../lib/supabaseAdmin'

type TokenPayload = { community_id?: string; member_id?: string; exp?: number }

function decodeToken(token: string): { ok: true; data: TokenPayload } | { ok: false; reason: string } {
  try {
    const parts = token.split('.');

    // support both formats
    const payloadPart =
      parts.length === 3 ? parts[1] :   // JWT style
      parts.length === 2 ? parts[0] :   // Magic link style
      null;

    if (!payloadPart) return { ok: false, reason: 'unexpected token format' };

    // base64url -> base64 + padding
    const b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const json = Buffer.from(b64 + pad, 'base64').toString('utf8');

    const data = JSON.parse(json) as TokenPayload;
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'decode error' };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  try {
    const { token, email, q1, q2, q3 } = (req.body ?? {}) as {
      token?: string; email?: string; q1?: string; q2?: string; q3?: string
    }

    console.log('[save-answers] raw body keys:', Object.keys(req.body || {}))

    const dec = decodeToken(token)
    if (!dec.ok) {
      console.warn('[save-answers] token issue:', dec.reason)
      return res.status(400).json({ error: 'bad token', reason: dec.reason })
    }

    const { community_id, member_id, exp } = dec.data!
    console.log('[save-answers] decoded:', { community_id, member_id, exp })

    if (!community_id || !member_id) {
      return res.status(400).json({ error: 'token missing ids', keys: Object.keys(dec.data || {}) })
    }

    const answers = {
      community_id,
      member_id,
      email: email ?? null,
      q1: q1 ?? null,
      q2: q2 ?? null,
      q3: q3 ?? null,
      meta: { via: 'welcome', ts: Date.now() }
    }

    console.log('[save-answers] inserting:', answers)

    const { error } = await supabaseAdmin
      .from('onboarding_answers')
      .insert(answers)

    if (error) {
      console.error('[save-answers] supabase error:', error)
      return res.status(400).json({ error: 'db insert failed', detail: error.message, code: (error as any).code })
    }

    return res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('[save-answers] unhandled:', err)
    return res.status(500).json({ error: 'server error', detail: err?.message || String(err) })
  }
}

