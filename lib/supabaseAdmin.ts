import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE!; // server-only key

if (!url) throw new Error('SUPABASE_URL is required (NEXT_PUBLIC_SUPABASE_URL)');
if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE is required');

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

export default supabaseAdmin;
