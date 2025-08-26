// app/api/questions/[communityId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

type UIQuestion = {
  id?: string;
  text: string;
  type: string;
  required: boolean;
  position: number;
  options?: { value: string; label?: string }[];
  key_slug?: string;
};

function slugify(s?: string) {
  if (!s) return '';
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function optionsToTextArray(opts?: UIQuestion['options']): string[] {
  if (!Array.isArray(opts)) return [];
  return opts.map(o => String(o?.value ?? o?.label ?? '').trim()).filter(Boolean);
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
      .select('id, community_id, label, type, is_required, order_index, options, key_slug')
      .eq('community_id', params.communityId)
      .order('order_index', { ascending: true });

    if (error) {
      console.warn('[questions.GET] soft-fail', { cid: params.communityId, msg: error.message });
      return NextResponse.json({ ok: true, items: [] });
    }

    const items: UIQuestion[] = (data || []).map(row => ({
      id: row.id,
      text: row.label,
      type: row.type,
      required: !!row.is_required,
      position: typeof row.order_index === 'number' ? row.order_index : 0,
      options: textArrayToOptions(row.options),
      key_slug: row.key_slug,
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
    if (!list.length) return NextResponse.json({ ok: false, error: 'No questions provided' });

    // Build payload keyed by (community_id,key_slug)
    const payload = list.map((q, i) => {
      const text = (q.text || '').trim();
      if (!text) throw new Error('Each question needs text');
      const pos = Number.isFinite(q.position) ? q.position : i;
      const key_slug = (q.key_slug && q.key_slug.trim()) || slugify(text) || `q_${i}`;

      const row: any = {
        community_id: params.communityId,
        key_slug,                 // <— stable key
        label: text,
        type: q.type || 'text',
        is_required: !!q.required,
        order_index: pos,
        options: optionsToTextArray(q.options),
      };

      // DO NOT set id on new rows; let DB default generate it
      if (q.id) row.id = q.id;
      return row;
    });

    // Upsert ON (community_id,key_slug)
    const { error: upsertErr } = await supabase
      .from('onboarding_questions')
      .upsert(payload, { onConflict: 'community_id,key_slug' });

    if (upsertErr) {
      console.error('[questions.PUT] upsert error', upsertErr.message);
      return NextResponse.json({ ok: false, error: upsertErr.message });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[questions.PUT] hard error', e?.message);
    return NextResponse.json({ ok: false, error: e?.message || 'Save failed' });
  }
}