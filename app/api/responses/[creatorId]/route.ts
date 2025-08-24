import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'; // Adjust path as needed

export async function POST(req: Request, { params }: { params: { creatorId: string } }) {
  const { creatorId } = params;
  const { memberId, email, responses } = await req.json();

  if (!creatorId || !memberId || !responses) {
    return NextResponse.json({ ok: false, reason: 'Missing parameters' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        community_id: creatorId,
        member_id: memberId,
        email: email || null,
        ...responses,
      })
      .select();

    if (error) {
      console.error('[API_RESPONSES] Error saving onboarding responses:', error);
      return NextResponse.json({ ok: false, reason: 'Failed to save responses' }, { status: 500 });
    }

    console.log('[API_RESPONSES] Onboarding responses saved:', data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API_RESPONSES] Unexpected error saving responses:', error);
    return NextResponse.json({ ok: false, reason: 'Internal server error' }, { status: 500 });
  }
}
