// app/api/admin/last-webhooks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function checkAuth(req: NextRequest): boolean {
  const secretQ = req.nextUrl.searchParams.get('secret') || '';
  const secretH = req.headers.get('x-admin-secret') || '';
  const adminSecret = process.env.ADMIN_DASH_SECRET || '';
  
  return !!(adminSecret && (secretQ === adminSecret || secretH === adminSecret));
}

export async function GET(req: NextRequest) {
  // Auth: require the same admin secret
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Support query params: limit (default 10), keysOnly (boolean)
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100); // Cap at 100
  const keysOnly = url.searchParams.get('keysOnly') === 'true';

  const supabase = getSupabaseAdmin();

  try {
    // Return the most recent rows with specified fields
    const { data, error } = await supabase
      .from('webhook_events')
      .select(`
        id,
        created_at,
        event_type,
        external_event_id,
        community_id,
        content_type,
        raw_headers,
        raw_payload
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('LAST_WEBHOOKS_QUERY_FAIL', error);
      return NextResponse.json({ ok: false, error: 'query_failed', details: error.message }, { status: 500 });
    }

    // Process the data based on keysOnly parameter
    const processedData = data?.map(row => ({
      id: row.id,
      created_at: row.created_at,
      event_type: row.event_type,
      external_event_id: row.external_event_id,
      community_id: row.community_id,
      content_type: row.content_type,
      raw_headers: row.raw_headers,
      raw_payload: keysOnly && row.raw_payload 
        ? Object.keys(row.raw_payload) 
        : row.raw_payload
    })) || [];

    return NextResponse.json({
      ok: true,
      count: processedData.length,
      limit,
      keysOnly,
      data: processedData
    });

  } catch (e: any) {
    console.error('LAST_WEBHOOKS_EXCEPTION', e);
    return NextResponse.json({ ok: false, error: 'server_error', details: e.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
