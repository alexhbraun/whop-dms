// app/api/admin/replay-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service'; // use existing service client
import { getTemplateForCommunity } from '@/lib/db/templates'; // template selection
import { getWhopClient } from '@/lib/whopClient'; // direct Whop client
import { renderTemplate } from '@/lib/dm'; // template rendering
import { getBaseUrl } from '@/lib/urls'; // base URL helper
import { coerceEventId } from '@/lib/db'; // event ID utility

type ReplayBody = {
  externalEventId?: string;
  dryRun?: boolean;
  verbose?: boolean;
};

function hasPlaceholders(s?: string | null): boolean {
  return !!(s && (s.includes('<') || s.includes('>')));
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

  // 1) Look up the corresponding row from public.webhook_events by external_event_id
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

  // 2) Resolve communityId and toUser from webhook payload
  const communityId = w.payload?.data?.community_id || w.community_id || null;
  const toUser = w.payload?.data?.user?.username || null;

  // 3) Add placeholder guard
  if (hasPlaceholders(communityId) || hasPlaceholders(toUser)) {
    const detail = {
      communityId: hasPlaceholders(communityId) ? 'contains_placeholders' : 'ok',
      toUser: hasPlaceholders(toUser) ? 'contains_placeholders' : 'ok'
    };
    return NextResponse.json({ 
      ok: false, 
      error: "placeholders_detected", 
      detail 
    }, { status: 400 });
  }

  // 4) Validate required fields
  if (!toUser) {
    return NextResponse.json({ ok: false, error: 'missing_username' }, { status: 400 });
  }
  if (!communityId) {
    return NextResponse.json({ ok: false, error: 'missing_community' }, { status: 400 });
  }

  // 5) Render the DM text using existing template resolution
  const tmpl = await getTemplateForCommunity(communityId);
  
  // Build context for rendering
  const member_name = toUser;
  const community_name = communityId;
  const onboarding_link = `${getBaseUrl()}/onboarding/${communityId}`;
  const ctx = { member_name, community_name, onboarding_link };

  const messageText = tmpl?.content ? renderTemplate(tmpl.content, ctx) : `Hi ${toUser}, welcome to ${community_name}! Tap here to get started: ${onboarding_link}`;
  const messagePreview = previewOf(messageText, 140);

  console.log('REPLAY_RESOLVED', { eventType: w.event_type, communityId, toUser, hasTemplate: !!tmpl });

  // 6) If dryRun: return preview without sending or logging
  if (dryRun) {
    return NextResponse.json({
      ok: true,
      mode: "dryRun",
      preview: {
        communityId,
        eventType: w.event_type,
        to: toUser,
        templateId: tmpl?.id || null,
        messagePreview
      }
    });
  }

  // 7) Real send: call DM send function
  let dmStatus: "sent" | "failed" = "failed";
  let errorTextOrNull: string | null = null;

  try {
    const whopClient = getWhopClient();
    await whopClient.messages.sendDirectMessageToUser({
      toUserIdOrUsername: toUser,
      message: messageText
    });
    dmStatus = "sent";
    console.log('REPLAY_SEND_SUCCESS', { toUser, communityId, externalEventId });
  } catch (e: any) {
    errorTextOrNull = e?.message || String(e);
    console.error("DM_SEND_FAIL", { toUser, communityId, externalEventId, error: errorTextOrNull });
  }

  // 8) Insert into Supabase public.dm_send_log using ONLY existing columns
  const externalEventIdOrUuid = coerceEventId(externalEventId);
  const row = {
    event_id: externalEventIdOrUuid,
    business_id: communityId,        // map community → business_id
    to_user: toUser,
    status: dmStatus,                // 'sent' or 'failed'
    error: errorTextOrNull,
    source: 'replay',
    message_preview: messagePreview
  };

  let dmLogInsertError = null;
  try {
    const { error: insertError } = await supabase
      .from('dm_send_log')
      .insert(row)
      .select()
      .single();
    
    if (insertError) {
      dmLogInsertError = insertError.message;
      console.error('DM_LOG_INSERT_FAIL', { error: insertError, insertRow: row });
    }
  } catch (e: any) {
    dmLogInsertError = e?.message || String(e);
    console.error('DM_LOG_INSERT_FAIL', { error: e, insertRow: row });
  }

  // 9) Always log compact result
  console.log('REPLAY_SEND_RESULT', { 
    ok: dmStatus === 'sent', 
    sent: dmStatus === 'sent', 
    templateId: tmpl?.id || null, 
    toUser, 
    communityId, 
    externalEventId 
  });

  // 10) Respond (always 200, include dmLogInsertError if present)
  return NextResponse.json({
    ok: dmStatus === 'sent',
    sent: dmStatus === 'sent',
    result: dmStatus,
    toUser,
    communityId,
    templateId: tmpl?.id || null,
    preview: messagePreview,
    dmLogInsertError
  });
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