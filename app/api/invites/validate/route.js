import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabaseServer'; // Corrected import path

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get('creatorId');
  const memberId = searchParams.get('memberId');
  const token = searchParams.get('t');

  if (!creatorId || !memberId || !token) {
    return NextResponse.json({ ok: false, reason: 'Missing parameters' }, { status: 400 });
  }

  try {
    const supabase = getServerSupabase();
    const { data: invite, error } = await supabase
      .from('onboarding_invites')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('member_id', memberId)
      .eq('token', token)
      .single();

    if (error || !invite) {
      console.warn('[API_INVITES_VALIDATE] Invite not found or DB error:', error?.message);
      return NextResponse.json({ ok: false, reason: 'Invite invalid or not found' }, { status: 404 });
    }

    if (invite.expires_at < new Date().toISOString()) {
      console.warn('[API_INVITES_VALIDATE] Expired invite for creator:', creatorId, 'member:', memberId);
      return NextResponse.json({ ok: false, reason: 'Link expired' }, { status: 400 });
    }

    if (invite.used_at) {
      console.warn('[API_INVITES_VALIDATE] Already used invite for creator:', creatorId, 'member:', memberId);
      return NextResponse.json({ ok: false, reason: 'Link already used' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, invite: { creator_id: invite.creator_id, member_id: invite.member_id } });
  } catch (error) {
    console.error('[API_INVITES_VALIDATE] Unexpected error validating invite:', error);
    return NextResponse.json({ ok: false, reason: 'Internal server error' }, { status: 500 });
  }
}
