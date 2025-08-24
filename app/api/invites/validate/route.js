import { NextResponse } from 'next/server';
// import { verify } from 'jsonwebtoken'; // For JWT, if we use it later
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'; // Adjust path as needed

const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get('creatorId');
  const memberId = searchParams.get('memberId');
  const token = searchParams.get('t');

  if (!creatorId || !memberId || !token) {
    return NextResponse.json({ ok: false, reason: 'Missing parameters' }, { status: 400 });
  }

  if (!MAGIC_LINK_SECRET) {
    console.error('[INVITE_VALIDATE] MAGIC_LINK_SECRET environment variable is not set.');
    return NextResponse.json({ ok: false, reason: 'Server configuration error' }, { status: 500 });
  }

  try {
    // In a real scenario, if \`token\` was a JWT, you would verify it here:
    // const decoded = verify(token, MAGIC_LINK_SECRET); // Example for JWT
    // if (decoded.creatorId !== creatorId || decoded.memberId !== memberId) { ... }

    // Check DB row exists, not expired, not used
    const { data: invite, error: dbError } = await supabaseAdmin
      .from('onboarding_invites')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('member_id', memberId)
      .eq('token', token)
      .single();

    if (dbError || !invite) {
      console.warn('[INVITE_VALIDATE] Invite not found or DB error:', dbError?.message);
      return NextResponse.json({ ok: false, reason: 'Link invalid or not found' }, { status: 404 });
    }

    if (invite.expires_at < new Date().toISOString()) {
      console.warn('[INVITE_VALIDATE] Expired invite for creator:', creatorId, 'member:', memberId);
      return NextResponse.json({ ok: false, reason: 'Link expired' }, { status: 400 });
    }

    if (invite.used_at) {
      console.warn('[INVITE_VALIDATE] Used invite for creator:', creatorId, 'member:', memberId);
      return NextResponse.json({ ok: false, reason: 'Link already used' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[INVITE_VALIDATE] Unexpected error during validation:', error);
    return NextResponse.json({ ok: false, reason: 'Internal server error' }, { status: 500 });
  }
}
