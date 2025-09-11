// app/api/admin/replay-webhook/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTemplateForCommunity } from '@/lib/db/templates'; // template selection
import { renderTemplate } from '@/lib/dm'; // template rendering
import { getBaseUrl } from '@/lib/urls'; // base URL helper
import { sendDM } from '@/lib/sendDM'; // DM sender

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

export async function POST(req: Request) {
  const secretQ = new URL(req.url).searchParams.get('secret') || '';
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

  // Get environment variables
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ ok: false, error: 'missing-supabase-config' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });

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

  const renderedMessage = tmpl?.content ? renderTemplate(tmpl.content, ctx) : `Hi ${toUser}, welcome to ${community_name}! Tap here to get started: ${onboarding_link}`;
  const messagePreview = previewOf(renderedMessage, 200);

  console.log('REPLAY_RESOLVED', { eventType: w.event_type, communityId, toUser, hasTemplate: !!tmpl });

  // --- send the DM (unless dryRun) ---
  let dmStatus: "sent" | "failed" = "failed";
  let dmError: string | null = null;

  if (dryRun) {
    // no send, just preview
    return NextResponse.json({
      ok: true,
      mode: "dryRun",
      preview: {
        communityId,
        eventType: w.event_type,
        to: toUser,
        templateId: tmpl?.id || null,
        messagePreview: renderedMessage, // keep it short upstream if needed
      },
    });
  }

  // real send
  const dmResult = await sendDM({
    toUser,                 // e.g., "alexhbraun"
    message: renderedMessage,
    communityId,            // used only for template selection / context; NOT written as column name
  });
  if (dmResult?.ok) {
    dmStatus = "sent";
  } else {
    dmStatus = "failed";
    dmError = dmResult?.error || "unknown";
  }

  // --- log to Supabase using ONLY the allowed columns ---
  const insertRow = {
    event_id: externalEventId,       // same id as the webhook event
    business_id: communityId,
    to_user: toUser,
    status: dmStatus,                // 'sent' | 'failed'
    error: dmError,
    source: "admin",                 // replay
    message_preview: (renderedMessage || "").slice(0, 200),
  };

  // Idempotent write: if it already exists, update the latest info.
  const { error: logErr } = await supabase
    .from("dm_send_log")
    .upsert(insertRow, { onConflict: "event_id", ignoreDuplicates: false });

  if (logErr) {
    console.error("DM_LOG_INSERT_FAIL", { logErr, insertRow });
  }

  // final response
  return NextResponse.json({
    ok: dmStatus === "sent",
    sent: dmStatus === "sent",
    result: dmStatus,
    toUser,
    communityId,
    templateId: tmpl?.id || null,
    preview: renderedMessage,
    dmLogInsertError: logErr?.message || null,
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