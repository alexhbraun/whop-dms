import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Helpful log so I can see which one is missing
  console.error('Supabase env missing', {
    hasUrl: !!url,
    hasAnon: !!anon,
  });
  throw new Error('Supabase URL/Anon key missing from env');
}

export const supabase = createClient(url, anon);
