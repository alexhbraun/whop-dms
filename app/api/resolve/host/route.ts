import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = url.searchParams.get('host');
  if (!host) return NextResponse.json({ ok:false, error:'missing host' }, { status:400 });

  const supabase = getServerSupabase();
  const { data } = await supabase.from('host_map').select('business_id').eq('embed_host', host).maybeSingle();
  if (data?.business_id) return NextResponse.json({ ok:true, business_id: data.business_id });
  return NextResponse.json({ ok:false, error:'not_found' }, { status:404 });
}

export async function POST(req: Request) {
  const { host, business_id } = await req.json();
  if (!host || !business_id) return NextResponse.json({ ok:false, error:'missing fields' }, { status:400 });

  const supabase = getServerSupabase();
  const { error } = await supabase.from('host_map').upsert({
    embed_host: host,
    business_id,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}
