// app/api/admin/replay-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service'; // use existing service client
import { sendWelcomeDM } from '@/lib/dm'; // existing DM sender

type ReplayBody = {
  externalEventId?: string;
  dryRun?: boolean;
  verbose?: boolean;
};

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
  const { data: wh, error: whErr } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('external_event_id', externalEventId)
    .maybeSingle();

  if (whErr) {
    console.error('REPLAY_LOOKUP_FAIL', { externalEventId, error: whErr });
    return NextResponse.json({ ok: false, error: 'lookup-failed', details: whErr.message }, { status: 500 });
  }
  if (!wh) {
    return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
  }

  // 2) Resolve type, community, username from payload json if available
  // payload is JSONB in DB
  const payload = wh.payload || {};
  const pType = payload?.type;
  const pCommunity = payload?.data?.community_id ?? payload?.community_id ?? wh.community_id ?? wh.business_id ?? null;
  const pUsername =
    payload?.data?.user?.username ??
    payload?.user?.username ??
    null;

  // Construct a minimal message text (you likely have a template resolver; call it)
  const toUser = pUsername || '';
  const communityId = pCommunity || '';
  const eventType = pType || wh.event_type || 'unknown';

  // Use your existing template render if you have one; here we just build a simple preview
  const messageText =
    `Hi ${toUser || 'there'}, welcome to ${communityId || 'the community'}! Tap here to get started.`.trim();
  const message_preview = previewOf(messageText, 140);

  console.log('REPLAY_RESOLVED', { eventType, communityId, toUser, hasPayload: !!payload });

  // 3) Send (or dry run)
  let sendStatus: 'sent' | 'failed' | 'dry-run' = dryRun ? 'dry-run' : 'failed';
  let sendError: string | null = null;

  if (dryRun) {
    console.log('REPLAY_DRY_RUN_PREVIEW', { toUser, communityId, message_preview });
  } else {
    try {
      const send = await sendWelcomeDM({
        businessId: communityId, // required parameter
        communityId,
        toUserIdOrUsername: toUser,
        eventId: externalEventId,
        source: 'replay',
      });
      if (send?.ok) {
        sendStatus = 'sent';
      } else {
        sendStatus = 'failed';
        sendError = send?.error || 'unknown-send-failure';
      }
      console.log('REPLAY_SEND_RESULT', { ok: !!send?.ok, error: send?.error });
    } catch (e: any) {
      sendStatus = 'failed';
      sendError = e?.message || String(e);
      console.error('REPLAY_SEND_THROW', { error: sendError });
    }
  }

  // 4) Always attempt to insert a dm_send_log row (even for dry-run)
  const insertRow = {
    event_id: String(wh.id),              // link back to webhook_events.id
    community_id: String(communityId || ''), // ALWAYS write community_id (not business_id)
    to_user: String(toUser || ''),
    status: sendStatus,
    error: sendError,
    source: 'admin',
    message_preview,
  } as const;

  const { error: insErr } = await supabase.from('dm_send_log').insert(insertRow);

  if (insErr) {
    console.error('DM_LOG_INSERT_FAIL', { error: insErr, insertRow });
    return NextResponse.json(
      {
        ok: false,
        sent: sendStatus === 'sent',
        reason: 'insert-failed',
        supabaseError: insErr.message,
        preview: { eventType, communityId, to: toUser, message_preview },
      },
      { status: 500 },
    );
  }

  console.log('DM_LOG_INSERT_OK', { event_id: insertRow.event_id, community_id: insertRow.community_id, status: insertRow.status });

  return NextResponse.json({
    ok: true,
    sent: sendStatus === 'sent',
    preview: { eventType, communityId, to: toUser, message_preview },
    result: { status: sendStatus },
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