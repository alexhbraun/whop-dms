// node scripts/env-check.js
const rawA = process.env.SUPABASE_ANON_KEY_SERVER || '';
const rawB = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const tidy = s => (s || '').trim();
const A = tidy(rawA), B = tidy(rawB);

const mask = s => s ? (s.slice(0,10) + '…' + s.slice(-10)) : '(missing)';

console.log(JSON.stringify({
  SUPABASE_ANON_KEY_SERVER: { length: A.length, sample: mask(A) },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: { length: B.length, sample: mask(B) }
}, null, 2));





