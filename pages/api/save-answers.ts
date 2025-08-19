import type { NextApiRequest, NextApiResponse } from 'next'
import supabaseAdmin from '../../lib/supabaseAdmin'
import { verifyToken, type TokenPayload } from 'lib/token'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  try {
    const { email, q1, q2, q3 } = (req.body ?? {}) as {
      email?: string; q1?: string; q2?: string; q3?: string
    }

    console.log('[save-answers] raw body keys:', Object.keys(req.body || {}))

    const auth = req.headers.authorization ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : (req.body?.token as string) || (req.query.token as string);

    if (!token) {
      console.warn('[save-answers] token issue: missing token')
      return res.status(400).json({ error: 'bad token', reason: 'missing token' })
    }

    let payload: TokenPayload;
    try {
      payload = verifyToken(token);
    } catch (e: any) {
      console.warn('[save-answers] token issue:', e?.message)
      return res.status(400).json({ error: 'bad token', reason: e?.message || 'verify failed' })
    }

    const { sub, community_id, member_id, exp } = payload
    console.log('[save-answers] decoded:', { sub, community_id, member_id, exp })

    const finalCommunityId = community_id ?? (payload as any).communityId;
    const finalMemberId = member_id ?? (payload as any).memberId;

    if (!finalCommunityId || !finalMemberId) {
      return res.status(400).json({ error: 'token missing ids', keys: Object.keys(payload || {}) })
    }

    const answers = {
      community_id: finalCommunityId,
      member_id: finalMemberId,
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

