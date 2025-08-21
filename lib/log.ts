// lib/log.ts
import { supabaseAdmin } from './supabaseAdmin';

export async function logEvent(
  path: string,
  level: 'info' | 'error',
  summary: string,
  payload?: any
) {
  try {
    await supabaseAdmin.from('event_logs').insert({
      path,
      level,
      summary,
      payload
    });
  } catch (e: any) {
    console.error('[LOG-FAIL]', { path, level, summary, err: e?.message });
  }
}
