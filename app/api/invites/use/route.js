import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabaseServer'; // Corrected import path

export async function POST(req: Request) {
  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ ok: false, reason: 'Missing token' }, { status: 400 });
  }

  try {
    const supabase = getServerSupabase();
    const { data: invite, error } = await supabase
      .from('onboarding_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)
      .is('used_at', null) // Ensure it hasn't been used yet
      .select();

    if (error) {
      console.error('[API_INVITES_USE] Error marking invite as used:', error);
      return NextResponse.json({ ok: false, reason: 'Failed to use invite' }, { status: 500 });
    }

    if (!invite || invite.length === 0) {
      return NextResponse.json({ ok: false, reason: 'Invite not found or already used' }, { status: 404 });
    }

    console.log('[API_INVITES_USE] Invite marked as used:', invite);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API_INVITES_USE] Unexpected error using invite:', error);
    return NextResponse.json({ ok: false, reason: 'Internal server error' }, { status: 500 });
  }
}
