import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

// GET: list templates for a community
export async function GET(_req: Request, { params }: { params: { creatorId: string } }) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('dm_templates')
    .select('id, name, content, is_default, steps, created_at, updated_at')
    .eq('community_id', params.creatorId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true, templates: data ?? [] });
}

// POST: create template; tolerates missing body by seeding defaults
export async function POST(req: Request, { params }: { params: { creatorId: string } }) {
  const supabase = getServerSupabase();
  let body: any = {};
  try { body = await req.json(); } catch {} // Tolerates empty body
  const name = (body?.name ?? 'Welcome Message').toString();
  const content = (body?.content ?? 'Hi {{member_name}}, welcome to {{community_name}}! Tap here to answer a couple of quick questions: {{onboarding_link}}').toString();
  const is_default = Boolean(body?.is_default ?? true);
  const steps = body?.steps ?? null; // optional JSON structure

  if (!name.trim() || !content.trim()) {
    return NextResponse.json({ ok:false, error:'Name and content are required' }, { status:400 });
  }

  // If making default, unset others for this creator
  if (is_default) {
    await supabase.from('dm_templates').update({ is_default:false }).eq('community_id', params.creatorId);
  }

  const { data, error } = await supabase
    .from('dm_templates')
    .insert({
      community_id: params.creatorId,
      name,
      content,
      is_default,
      ...(steps ? { steps } : {}), // Conditionally include steps if present
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true, id: data?.id });
}

