import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request, context: { params: { creatorId: string } }) {
  const creatorId = context.params.creatorId;
  if (!creatorId) {
    return NextResponse.json({ ok: false, error: 'Creator ID is required' }, { status: 400 });
  }

  try {
    const { name, content, subject, is_default } = await req.json();

    if (!name || !content) {
      return NextResponse.json({ ok: false, error: 'Name and content are required' }, { status: 400 });
    }

    const supabase = getServerSupabase();

    const { data, error } = await supabase
      .from('dm_templates')
      .insert({
        community_id: creatorId,
        name,
        content,
        subject: subject || '', // Default to empty string if not provided
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting template:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

