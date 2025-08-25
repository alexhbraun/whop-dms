import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin'; // Use supabaseAdmin for server-side

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');
  if (!slug) return NextResponse.json({ ok: false, error: 'missing slug' }, { status: 400 });

  const supabase = supabaseAdmin; // Use the server-side admin client
  const { data: row, error } = await supabase
    .from('community_map')
    .select('business_id, community_slug')
    .eq('community_slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error fetching from community_map:', error);
    // Do not expose raw DB errors to client in production
  }

  if (row?.business_id) {
    return NextResponse.json({ ok: true, business_id: row.business_id, source: 'cache' });
  }

  // TODO: Optionally call Whop API here to get business_id from slug and upsert cache.
  // For now: fall back to env default if present.
  const fallback = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || null;
  if (fallback) {
    return NextResponse.json({ ok: true, business_id: fallback, source: 'env_fallback' });
  }
  return NextResponse.json({ ok: false, error: 'not_resolved' }, { status: 404 });
}
