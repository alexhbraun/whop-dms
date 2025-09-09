import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';

export async function POST() {
  try {
    const sb = getServiceClient();

    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      event_type: 'probe',
      community_id: 'probe',
      payload: { via: 'insert-probe', ts: Date.now() },
      received_at: now,
    };

    const { error } = await sb
      .from('webhook_events')
      .insert(row);

    if (error) {
      console.error('INSERT_PROBE_FAIL', error);
      return NextResponse.json({ ok:false, where:'insert', error: String(error.message) }, { status: 500 });
    }

    return NextResponse.json({ ok:true, row });
  } catch (e:any) {
    console.error('INSERT_PROBE_EXCEPTION', e);
    return NextResponse.json({ ok:false, where:'exception', error: String(e?.message || e) }, { status: 500 });
  }
}
