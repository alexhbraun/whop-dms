import { getServerSupabase } from '@/lib/supabaseServer';

export type UIQuestion = {
  id?: string;
  text: string;
  type: 'text' | 'long_text' | 'email' | 'single_select' | 'multi_select' | string;
  required: boolean;
  position: number;
  options?: { value: string; label?: string }[]; // UI prefers JSON array
  key_alias?: string | null; // optional pass-through
};

function textArrayFromOptions(opts?: UIQuestion['options']): string[] | null {
  if (!opts || !Array.isArray(opts) || !opts.length) return [];
  // store values only; keep label if you want later
  return opts.map(o => String(o.value || o.label || '').trim()).filter(Boolean);
}

function optionsFromTextArray(arr: string[] | null): UIQuestion['options'] {
  const a = Array.isArray(arr) ? arr : [];
  return a.map(v => ({ value: v, label: v }));
}

export async function fetchQuestions(communityId: string): Promise<UIQuestion[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('onboarding_questions')
    .select('id, community_id, label, key_alias, type, is_required, options, order_index')
    .eq('community_id', communityId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map(row => ({
    id: row.id,
    text: row.label,
    type: row.type,
    required: !!row.is_required,
    position: typeof row.order_index === 'number' ? row.order_index : 0,
    options: optionsFromTextArray(row.options),
    key_alias: row.key_alias ?? null,
  }));
}

export async function saveQuestions(communityId: string, list: UIQuestion[]) {
  // basic validation
  for (const q of list) {
    if (!q || !q.text?.trim()) throw new Error('Question text is required');
    if (typeof q.position !== 'number') throw new Error('Each question must include a numeric position');
  }

  const supabase = getServerSupabase();

  // Strategy: Upsert each by id if present, else insert; then delete rows not in the submitted set.
  const incomingIds = list.filter(q => q.id).map(q => q.id as string);

  // 1) Upsert/Insert
  const payload = list.map(q => ({
    id: q.id ?? undefined,
    community_id: communityId,
    label: q.text.trim(),
    key_alias: q.key_alias ?? null,
    type: q.type,
    is_required: !!q.required,
    order_index: q.position ?? 0,
    options: textArrayFromOptions(q.options), // text[]
  }));

  const { error: upsertErr } = await supabase
    .from('onboarding_questions')
    .upsert(payload, { onConflict: 'id' });

  if (upsertErr) throw new Error(upsertErr.message);

  // 2) Delete any existing rows for this community not present in the submission (only if you want full replace)
  const { data: existing, error: listErr } = await supabase
    .from('onboarding_questions')
    .select('id')
    .eq('community_id', communityId);
  if (listErr) throw new Error(listErr.message);

  const toDelete = (existing || [])
    .map(r => r.id)
    .filter((id: string) => !incomingIds.includes(id) && !payload.find(p => p.id === id));

  if (toDelete.length) {
    const { error: delErr } = await supabase
      .from('onboarding_questions')
      .delete()
      .in('id', toDelete);
    if (delErr) throw new Error(delErr.message);
  }

  return { ok: true };
}
