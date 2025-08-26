import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

type UIQuestion = {
  id?: string;
  text: string;
  type: string;
  required: boolean;
  position: number;
  options?: { value: string; label?: string }[];
  key_alias?: string | null;
};

function optionsToTextArray(opts?: UIQuestion['options']): string[] {
  if (!opts) return [];
  return opts
    .map(o => (o?.value ?? o?.label ?? '').toString().trim())
    .filter(Boolean);
}

function textArrayToOptions(arr: any): UIQuestion['options'] {
  const a: string[] = Array.isArray(arr) ? arr : [];
  return a.map(v => ({ value: v, label: v }));
}

export async function GET(_req: Request, { params }: { params: { communityId: string } }) {
  const supabase = getServerSupabase();
  try {
    const { data, error } = await supabase
      .from('onboarding_questions')
      .select('id, community_id, label, key_alias, type, is_required, options, order_index')
      .eq('community_id', params.communityId)
      .order('order_index', { ascending: true });

    if (error) {
      console.warn('[questions.GET] soft-fail', { communityId: params.communityId, msg: error.message });
      return NextResponse.json({ ok: true, items: [] });
    }

    const items: UIQuestion[] = (data || []).map(row => ({
      id: row.id,
      text: row.label,
      type: row.type,
      required: !!row.is_required,
      position: typeof row.order_index === 'number' ? row.order_index : 0,
      options: textArrayToOptions(row.options),
      key_alias: row.key_alias ?? null,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error('[questions.GET] hard error', e?.message);
    return NextResponse.json({ ok: true, items: [] });
  }
}

export async function PUT(req: Request, { params }: { params: { communityId: string } }) {
  const supabase = getServerSupabase();
  try {
    const body = await req.json().catch(() => ({}));
    const list: UIQuestion[] = Array.isArray(body?.items) ? body.items : [];

    if (!list.length) {
      return NextResponse.json({ ok: false, error: 'No questions provided' });
    }

    // basic validation
    for (const q of list) {
      if (!q?.text || !q.text.trim()) return NextResponse.json({ ok: false, error: 'Each question needs text' });
      if (typeof q.position !== 'number') return NextResponse.json({ ok: false, error: 'Each question needs numeric position' });
    }

    // Upsert payload
    const payload = list.map(q => ({
      id: q.id ?? undefined,
      community_id: params.communityId,
      label: q.text.trim(),
      key_alias: q.key_alias ?? null,
      type: q.type,
      is_required: !!q.required,
      order_index: q.position,
      options: optionsToTextArray(q.options), // text[]
    }));

    const { error: upsertErr } = await supabase
      .from('onboarding_questions')
      .upsert(payload, { onConflict: 'id' });

    if (upsertErr) {
      console.error('[questions.PUT] upsert error', { msg: upsertErr.message });
      return NextResponse.json({ ok: false, error: upsertErr.message });
    }

    // Optional: delete rows not present in list (true "replace" behavior)
    const { data: existing, error: listErr } = await supabase
      .from('onboarding_questions')
      .select('id')
      .eq('community_id', params.communityId);

    if (listErr) {
      console.warn('[questions.PUT] list-after-upsert error', listErr.message);
    } else {
      const incomingIds = new Set(payload.map(p => p.id).filter(Boolean) as string[]);
      const toDelete = (existing || [])
        .map(r => r.id)
        .filter((id: string) => !incomingIds.has(id));
      if (toDelete.length) {
        const { error: delErr } = await supabase.from('onboarding_questions').delete().in('id', toDelete);
        if (delErr) console.warn('[questions.PUT] delete missing error', delErr.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[questions.PUT] hard error', e?.message);
    return NextResponse.json({ ok: false, error: e?.message || 'Save failed' });
  }
}