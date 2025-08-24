import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'; // Adjust path as needed

export async function POST(req) {
  const { creatorId, memberId, t: token } = await req.json();

  if (!creatorId || !memberId || !token) {
    return NextResponse.json({ ok: false, reason: 'Missing parameters' }, { status: 400 });
  }

  try {
    // First, verify the invite exists and is valid (not expired, not used)
    const { data: invite, error: fetchError } = await supabaseAdmin
      .from('onboarding_invites')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('member_id', memberId)
      .eq('token', token)
      .single();

    if (fetchError || !invite) {
      console.warn('[INVITE_USE] Invite not found or DB error during use attempt:', fetchError?.message);
      return NextResponse.json({ ok: false, reason: 'Invite invalid or not found' }, { status: 404 });
    }

    if (invite.expires_at < new Date().toISOString()) {
      console.warn('[INVITE_USE] Expired invite for creator:', creatorId, 'member:', memberId);
      return NextResponse.json({ ok: false, reason: 'Link expired' }, { status: 400 });
    }

    if (invite.used_at) {
      console.warn('[INVITE_USE] Already used invite for creator:', creatorId, 'member:', memberId);
      return NextResponse.json({ ok: false, reason: 'Link already used' }, { status: 400 });
    }

    // Update the invite to mark it as used
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('onboarding_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id)
      .select();

    if (updateError) {
      console.error('[INVITE_USE] Error updating invite used_at:', updateError);
      return NextResponse.json({ ok: false, reason: 'Failed to mark invite as used' }, { status: 500 });
    }

    console.log('[INVITE_USE] Invite marked as used:', updateData);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[INVITE_USE] Unexpected error marking invite as used:', error);
    return NextResponse.json({ ok: false, reason: 'Internal server error' }, { status: 500 });
  }
}
