// lib/log.ts

import { supabaseAdmin } from './supabaseAdmin';

export async function logEvent(path: string) {
  await supabaseAdmin.from('logs').insert({ path, at: new Date().toISOString() });
}
