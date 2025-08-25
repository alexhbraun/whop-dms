import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

// GET: read settings
export async function GET(_req: Request, { params }: { params: { communityId: string } }) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('community_settings')
    .select('community_id, require_email, webhook_url, updated_at')
    .eq('community_id', params.communityId)
    .maybeSingle();
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true, settings: data ?? { community_id: params.communityId, require_email:false, webhook_url:null } });
}

// PUT: upsert settings
export async function PUT(req: Request, { params }: { params: { communityId: string } }) {
  const supabase = getServerSupabase();
  let body:any = {};
  try { body = await req.json(); } catch {
  }

  const require_email = Boolean(body?.require_email ?? false);
  const webhook_url = body?.webhook_url ?? null;

  // basic validation for webhook URL
  if (webhook_url && typeof webhook_url === 'string') {
    const ok = /^https?:\/\//i.test(webhook_url.trim());
    if (!ok) return NextResponse.json({ ok:false, error:'Webhook URL must start with http(s)://' }, { status:400 });
  } else if (webhook_url !== null) {
    return NextResponse.json({ ok:false, error:'Invalid webhook URL' }, { status:400 });
  }

  const { error } = await supabase
    .from('community_settings')
    .upsert({
      community_id: params.communityId,
      require_email,
      webhook_url: webhook_url ? String(webhook_url).trim() : null,
      updated_at: new Date().toISOString(),
    });
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}
