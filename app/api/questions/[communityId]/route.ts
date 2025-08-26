import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

type UIOption = { value: string; label?: string };
type UIQuestion = {
  id?: string;
  text: string;
  type: string;
  required: boolean;
  position: number;
  options?: UIOption[];
  key_slug?: string;
};

function slugify(s?: string) {
  if (!s) return '';
  return s.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
function optionsToTextArray(opts?: UIOption[]): string[] {
  if (!Array.isArray(opts)) return [];
  return opts.map(o => String(o?.value ?? o?.label ?? '').trim()).filter(Boolean);
}
function textArrayToOptions(arr: any): UIOption[] {
  const a: string[] = Array.isArray(arr) ? arr : [];
  return a.map(v => ({ value: v, label: v }));
}
function mapRowToUI(row: any): UIQuestion {
  return {
    id: row.id,
    text: row.label,
    type: row.type,
    required: !!row.is_required,
    position: typeof row.order_index === 'number' ? row.order_index : 0,
    options: textArrayToOptions(row.options),
    key_slug: row.key_slug,
  };
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
    const items = (data || []).map(mapRowToUI);
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

    const payload = list.map((q, i) => {
      const text = (q.text || '').trim();
      if (!text) throw new Error('Each question needs text');
      const pos = Number.isFinite(q.position) ? q.position : i;
      const key_slug = (q.key_slug && q.key_slug.trim()) || slugify(text) || `q_${i}`;
      const row: any = {
        community_id: params.communityId,
        key_slug,                 // stable key
        label: text,
        type: q.type || 'text',
        is_required: !!q.required,
        order_index: pos,
        options: optionsToTextArray(q.options), // text[]
      };
      if (q.id) row.id = q.id; // omit when absent → DB default generates uuid
      return row;
    });

    // upsert keyed by (community_id, key_slug)
    const { error: upsertErr } = await supabase
      .from('onboarding_questions')
      .upsert(payload, { onConflict: 'community_id,key_slug' });

    if (upsertErr) {
      console.error('[questions.PUT] upsert error', upsertErr.message);
      return NextResponse.json({ ok: false, error: upsertErr.message, items: [] });
    }

    // No destructive delete. Now return canonical rows:
    const { data: after, error: afterErr } = await supabase
      .from('onboarding_questions')
      .select('id, community_id, label, type, is_required, order_index, options, key_slug')
      .eq('community_id', params.communityId)
      .order('order_index', { ascending: true });

    if (afterErr) {
      console.warn('[questions.PUT] post-select warn', afterErr.message);
      return NextResponse.json({ ok: true, items: [] });
    }

    const items = (after || []).map(mapRowToUI);
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error('[questions.PUT] hard error', e?.message);
    return NextResponse.json({ ok: false, error: e?.message || 'Save failed', items: [] });
  }
}