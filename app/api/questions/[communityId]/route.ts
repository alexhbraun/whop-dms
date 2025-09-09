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

// Generate a unique key_slug for the given business
async function generateUniqueKeySlug(supabase: any, businessId: string, text: string, position: number): Promise<string> {
  const baseSlug = slugify(text) || `q_${position}`;
  let keySlug = baseSlug;
  let counter = 0;
  
  while (true) {
    const { data } = await supabase
      .from('onboarding_questions')
      .select('id')
      .eq('community_id', businessId)
      .eq('key_slug', keySlug)
      .maybeSingle();
    
    if (!data) {
      return keySlug; // This key_slug is available
    }
    
    // Try with a counter suffix
    counter++;
    keySlug = `${baseSlug}_${counter}`;
  }
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
      .select('id, community_id, business_id, label, type, is_required, order_index, options, key_slug')
      .or(`business_id.eq.${params.communityId},community_id.eq.${params.communityId}`)
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

    // Separate new questions from existing ones
    // Temporary IDs start with "new-" or "temp-", real UUIDs don't
    const existingQuestions = list.filter(q => q.id && !q.id.startsWith('new-') && !q.id.startsWith('temp-'));
    const newQuestions = list.filter(q => !q.id || q.id.startsWith('new-') || q.id.startsWith('temp-'));

    // Handle existing questions (update)
    if (existingQuestions.length > 0) {
      const updatePayload = await Promise.all(existingQuestions.map(async (q, i) => {
        const text = (q.text || '').trim();
        if (!text) throw new Error('Each question needs text');
        const pos = Number.isFinite(q.position) ? q.position : i;
        const key_slug = (q.key_slug && q.key_slug.trim()) || await generateUniqueKeySlug(supabase, params.communityId, text, pos);
        
        return {
          id: q.id,
          community_id: params.communityId,
          business_id: params.communityId,
          key_slug,
          label: text,
          type: q.type || 'text',
          is_required: !!q.required,
          order_index: pos,
          options: optionsToTextArray(q.options),
        };
      }));

      const { error: updateErr } = await supabase
        .from('onboarding_questions')
        .upsert(updatePayload, { onConflict: 'id' });

      if (updateErr) {
        console.error('[questions.PUT] update error', updateErr.message);
        return NextResponse.json({ ok: false, error: updateErr.message, items: [] });
      }
    }

    // Handle new questions (insert)
    if (newQuestions.length > 0) {
      const insertPayload = await Promise.all(newQuestions.map(async (q, i) => {
        const text = (q.text || '').trim();
        if (!text) throw new Error('Each question needs text');
        const pos = Number.isFinite(q.position) ? q.position : i;
        const key_slug = (q.key_slug && q.key_slug.trim()) || await generateUniqueKeySlug(supabase, params.communityId, text, pos);
        
        return {
          community_id: params.communityId,
          business_id: params.communityId,
          key_slug,
          label: text,
          type: q.type || 'text',
          is_required: !!q.required,
          order_index: pos,
          options: optionsToTextArray(q.options),
        };
      }));

      const { error: insertErr } = await supabase
        .from('onboarding_questions')
        // Upsert on the unique pair to avoid duplicate key errors when the slug already exists
        .upsert(insertPayload, { onConflict: 'community_id, key_slug' });

      if (insertErr) {
        console.error('[questions.PUT] insert error', insertErr.message);
        return NextResponse.json({ ok: false, error: insertErr.message, items: [] });
      }
    }

    // No destructive delete. Now return canonical rows:
    const { data: after, error: afterErr } = await supabase
      .from('onboarding_questions')
      .select('id, community_id, business_id, label, type, is_required, order_index, options, key_slug')
      .or(`business_id.eq.${params.communityId},community_id.eq.${params.communityId}`)
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