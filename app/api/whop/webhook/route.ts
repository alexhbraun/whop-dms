// app/api/whop/webhook/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeDM as actualSendWelcomeDM } from "@/lib/dm";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

async function sendWelcomeDM(opts: {
  communityId: string;
  username?: string | null;
  eventId?: string | null;
  source?: string;
}) {
  try {
    // Use the actual sendWelcomeDM function and return its result
    return await actualSendWelcomeDM({
      businessId: opts.communityId, // our function uses businessId parameter
      toUserIdOrUsername: opts.username || "",
      eventId: opts.eventId || undefined,
      source: (opts.source as any) || "webhook",
    });
  } catch (e: any) {
    console.error("DM_SEND_ERROR", e?.message ?? e);
    throw e; // Re-throw so the caller can handle it
  }
}

// --- Helpers ---------------------------------------------------------------

function take(obj: Record<string, string>, allow: string[]) {
  const out: Record<string, string> = {};
  for (const k of allow) {
    const v = obj[k.toLowerCase()];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function normalizeHeaders(req: NextRequest) {
  const h: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    h[k.toLowerCase()] = v;
  });
  return h;
}

function extractEventType(
  headers: Record<string, string>,
  parsed: any
): string {
  // Prefer header if present
  const h1 = headers["x-whop-event"];
  const h2 = headers["x-whop__event"];
  if (h1 && typeof h1 === "string") return h1;
  if (h2 && typeof h2 === "string") return h2;

  // Fallback to body
  if (parsed && typeof parsed === "object") {
    if (typeof parsed.type === "string") return parsed.type;
    if (parsed.event && typeof parsed.event.type === "string")
      return parsed.event.type;
  }
  return "unknown";
}

function extractCommunityId(parsed: any): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  // Common places we saw across tests
  const d = parsed.data ?? parsed;
  return (
    d?.community_id ??
    d?.company_id ?? // older naming we saw in payloads
    d?.experience_id ?? // if you mapped "experience" to community
    null
  );
}

function extractUsername(parsed: any): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const d = parsed.data ?? parsed;
  return d?.user?.username ?? null;
}

function extractExternalEventId(parsed: any): string | null {
  // If your payload carries a stable external id, pull it here
  return parsed?.id ?? parsed?.event_id ?? null;
}

// --- Route handler ---------------------------------------------------------

export const dynamic = "force-dynamic"; // ensure no caching
export const runtime = "nodejs";        // supabase service key works best on node

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  // 1) Capture raw headers and parsed JSON body
  const lowercasedHeaders = new Map<string, string>();
  req.headers.forEach((value, key) => {
    lowercasedHeaders.set(key.toLowerCase(), value);
  });
  
  const raw = await req.text();
  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }
  
  const qp = new URL(req.url).searchParams;
  const force = qp.get('force') === '1';

  // 2) Derive event fields with robust fallbacks
  const hdr = lowercasedHeaders;
  
  const headerType =
    hdr.get('x-whop-event') ??
    hdr.get('x-whop-event-type') ??
    hdr.get('whop-event') ??
    undefined;

  const bodyType =
    body?.type ??
    body?.event ??
    body?.data?.type ??
    undefined;

  const eventType = headerType ?? bodyType ?? 'unknown';

  // company/community fallbacks
  const headerCompany =
    hdr.get('x-whop-company-id') ??
    hdr.get('x-whop-community-id') ??
    undefined;

  const bodyCompany =
    body?.data?.community_id ??
    body?.data?.company_id ??
    body?.community_id ??
    body?.company_id ??
    undefined;

  const communityId = headerCompany ?? bodyCompany ?? null;

  // username fallbacks
  const username =
    body?.data?.user?.username ??
    body?.user?.username ??
    body?.data?.username ??
    body?.username ??
    null;

  // external event id fallbacks
  const externalEventId =
    hdr.get('x-whop-event-id') ??
    body?.id ??
    body?.event_id ??
    null;

  console.log("WEBHOOK_HIT_DIAG", { eventType, communityId, username, externalEventId, force });

  // 3) Insert into webhook_events exactly what we received
  const headersDump = {
    'x-whop-event': hdr.get('x-whop-event'),
    'x-whop-company-id': hdr.get('x-whop-company-id'),
    'x-whop-community-id': hdr.get('x-whop-community-id'),
    'x-whop-event-id': hdr.get('x-whop-event-id'),
    'content-type': hdr.get('content-type'),
  };

  const insertRes = await supabase.from("webhook_events").insert({
    event_type: eventType,
    community_id: communityId,
    payload: body, // full parsed body (jsonb)
    headers_dump: headersDump, // small subset of headers (jsonb)
    external_event_id: externalEventId, // text
    received_at: new Date().toISOString(),
  }).select("id").single();

  if (insertRes.error) {
    console.error("WEBHOOK_INSERT_FAIL", insertRes.error);
    return NextResponse.json(
      { ok: false, step: "insert", error: insertRes.error.message },
      { status: 200 }
    );
  }

  const insertId = insertRes.data.id;
  console.log("WEBHOOK_INSERT_OK", { insertId });

  // 4) Decide whether to trigger DM
  const allowed = new Set([
    'membership.went_valid',
    'app_membership.went_valid',
    'membership_experience_claimed',
  ]);
  const shouldTrigger = force || (allowed.has(eventType) && !!communityId);

  console.log("WEBHOOK_DECISION", { shouldTrigger });

  if (!shouldTrigger) {
    return NextResponse.json({
      ok: true,
      triggered: false,
      reason: 'guard',
      eventType,
      communityId,
      username,
      externalEventId,
      insertId
    });
  }

  // 5) If shouldTrigger, call sendWelcomeDM
  try {
    const dmResult = await sendWelcomeDM({
      communityId: communityId!,
      username: username,
      eventId: externalEventId ?? insertId ?? 'evt_local',
      source: "webhook",
    });

    console.log("WEBHOOK_DM_RESULT", { 
      status: dmResult?.status || 'unknown', 
      error: dmResult?.error || null 
    });

    return NextResponse.json({
      ok: true,
      triggered: true,
      eventType,
      communityId,
      username,
      externalEventId,
      insertId,
      dm: {
        status: dmResult?.status || 'unknown',
        error: dmResult?.error || null,
        templateId: dmResult?.templateId || null
      }
    });
  } catch (e: any) {
    console.error("WEBHOOK_DM_RESULT", { 
      status: 'failed', 
      error: e?.message || String(e) 
    });

    return NextResponse.json({
      ok: true,
      triggered: true,
      eventType,
      communityId,
      username,
      externalEventId,
      insertId,
      dm: {
        status: 'failed',
        error: e?.message || String(e),
        templateId: null
      }
    });
  }
}

// Optional lightweight GET for smoke-probing the route from a browser
export async function GET() {
  return NextResponse.json({ ok: true, probe: "whop-webhook" });
}