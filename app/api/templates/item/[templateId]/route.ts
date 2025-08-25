import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

// PATCH: update name/content/is_default (and ensure single default per community)
export async function PATCH(req: Request, { params }: { params: { templateId: string } }) {
  const supabase = getServerSupabase();
  const id = params.templateId;
  let body:any = {};
  try { body = await req.json(); } catch {}

  // fetch current row (need community_id to unset defaults)
  const cur = await supabase.from('dm_templates').select('community_id').eq('id', id).maybeSingle();
  if (cur.error || !cur.data) return NextResponse.json({ ok:false, error:'not_found' }, { status:404 });

  const patch:any = {};
  if (typeof body.name === 'string') patch.name = body.name;
  if (typeof body.content === 'string') patch.content = body.content;
  if (typeof body.is_default === 'boolean') patch.is_default = body.is_default;
  if (body.steps !== undefined) patch.steps = body.steps;

  if (body.is_default === true) {
    await supabase.from('dm_templates').update({ is_default:false }).eq('community_id', cur.data.community_id);
  }

  const { data, error } = await supabase.from('dm_templates').update(patch).eq('id', id).select('id').single();
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true, id:data.id });
}

// DELETE: remove a template
export async function DELETE(_req: Request, { params }: { params: { templateId: string } }) {
  const supabase = getServerSupabase();
  const { error } = await supabase.from('dm_templates').delete().eq('id', params.templateId);
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}
