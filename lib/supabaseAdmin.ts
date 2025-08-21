// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
// Prefer SERVICE_ROLE on server; if not set, fallback to ANON (RLS must allow inserts).
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY!;

export const supabaseAdmin = createClient(url, key, {
  auth: { persistSession: false }
});
