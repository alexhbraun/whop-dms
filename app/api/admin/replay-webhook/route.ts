// app/api/admin/replay-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service'; // use existing service client
import { getTemplateForCommunity } from '@/lib/db/templates'; // template selection
import { getWhopClient } from '@/lib/whopClient'; // direct Whop client
import { renderTemplate } from '@/lib/dm'; // template rendering
import { getBaseUrl } from '@/lib/urls'; // base URL helper

type ReplayBody = {
  externalEventId?: string;
  dryRun?: boolean;
  verbose?: boolean;
};

function nonEmpty(s?: string | null) { 
  return !!s && s.trim() !== "" && !s.includes("<"); 
}

function previewOf(text: string, n = 140) {
  return (text || '').slice(0, n);
}

export async function POST(req: NextRequest) {
  const secretQ = req.nextUrl.searchParams.get('secret') || '';
  const adminSecret = process.env.ADMIN_DASH_SECRET || '';
  if (!adminSecret || secretQ !== adminSecret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: ReplayBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 400 });
  }
  const { externalEventId, dryRun = false, verbose = false } = body;

  if (!externalEventId) {
    return NextResponse.json({ ok: false, error: 'missing-externalEventId' }, { status: 400 });
  }

  const supabase = getServiceClient();

  console.log('WEBHOOK_REPLAY_BEGIN', { externalEventId, dryRun, verbose });

  // 1) Load webhook row (by external_event_id)
  const { data: w, error: whErr } = await supabase
    .from('webhook_events')
    .select('id, event_type, community_id, payload')
    .eq('external_event_id', externalEventId)
    .single();

  if (whErr) {
    console.error('REPLAY_LOOKUP_FAIL', { externalEventId, error: whErr });
    return NextResponse.json({ ok: false, error: 'lookup-failed', details: whErr.message }, { status: 500 });
  }
  if (!w) {
    return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
  }

  // 2) Derive effective community/business id
  const businessId = w.community_id || w.payload?.data?.community_id || null;

  // 3) Resolve the target username
  let toUser =
    (typeof w.payload?.data?.user?.username === 'string' && nonEmpty(w.payload.data.user.username))
      ? w.payload.data.user.username
      : process.env.TEST_WHOP_USERNAME || ""; // fallback for local testing

  if (!nonEmpty(toUser)) {
    console.log("REPLAY: missing toUser, refusing to send.", { externalEventId, businessId, toUser });
    
    // log a 'failed' row to dm_send_log using business_id (not community_id)
    await supabase.from('dm_send_log').insert({
      event_id: externalEventId,
      business_id: businessId,
      to_user: toUser || null,
      status: 'failed',
      error: 'You must provide at least one User to send a direct message to.',
      source: 'replay',
      message_preview: null
    });

    return NextResponse.json({ ok: false, error: 'Missing username' }, { status: 400 });
  }

  // 4) Render the DM text using existing template selection
  const tmpl = await getTemplateForCommunity(businessId);
  
  // Build context for rendering
  const member_name = toUser;
  const community_name = businessId || 'the community';
  const onboarding_link = `${getBaseUrl()}/onboarding/${businessId}`;
  const ctx = { member_name, community_name, onboarding_link };

  const messageText = tmpl?.content ? renderTemplate(tmpl.content, ctx) : `Hi ${toUser}, welcome to ${community_name}! Tap here to get started: ${onboarding_link}`;
  const preview = previewOf(messageText, 140);

  console.log('REPLAY_RESOLVED', { eventType: w.event_type, businessId, toUser, hasTemplate: !!tmpl });

  // 5) If dryRun → return what would be sent (no SDK call), do not insert a "sent" row
  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      toUser,
      businessId,
      templateId: tmpl?.id || null,
      preview
    });
  }

  // 6) Real send via Whop SDK
  let sendOk = false, sendErr = "";
  try {
    const whopClient = getWhopClient();
    const res = await whopClient.messages.sendDirectMessageToUser({
      toUserIdOrUsername: toUser, // IMPORTANT: username must be real, not a placeholder
      message: messageText
    });
    sendOk = true;
    console.log('REPLAY_SEND_SUCCESS', { toUser, businessId, externalEventId });
  } catch (e: any) {
    sendErr = (e?.message || String(e));
    console.error("DM_SEND_FAIL", { toUser, businessId, externalEventId, error: sendErr });
  }

  // 7) Insert into dm_send_log using ONLY the existing columns (no agent_display_name, no community_id)
  const row = {
    event_id: externalEventId,
    business_id: businessId,
    to_user: toUser,
    status: sendOk ? 'sent' : 'failed',
    error: sendOk ? null : sendErr,
    source: 'replay',
    message_preview: preview
  };

  const ins = await supabase.from('dm_send_log').insert(row).select().single();

  if (ins.error) {
    console.error("DM_LOG_INSERT_FAIL", { error: ins.error, row });
  } else {
    console.log("DM_LOG_INSERTED", ins.data);
  }

  // 8) Respond
  return NextResponse.json({
    ok: sendOk,
    result: sendOk ? 'sent' : 'failed',
    toUser,
    businessId,
    templateId: tmpl?.id || null,
    preview
  }, { status: sendOk ? 200 : 400 });
}

export const dynamic = "force-dynamic";

/*
# 1) Render dry-run:
# GET /api/admin/replay-webhook?secret=...&externalEventId=<last external_event_id>&dryRun=1
# -> returns the rendered message and ctx

# 2) Real send:
# POST /api/admin/replay-webhook?secret=... { "externalEventId":"..." }
# -> returns {ok:true, sent:true}

# 3) Duplicate protection:
# POST same payload again
# -> returns {ok:true, sent:false, reason:"duplicate"}
*/