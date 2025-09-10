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

  // 1) Capture headers in a lowercased map
  const headers = new Map<string, string>();
  req.headers.forEach((value, key) => {
    headers.set(key.toLowerCase(), value);
  });

  // 2) Read raw body with await req.text() (DO NOT call req.json() first)
  const raw = await req.text();
  
  // 3) Parse JSON with try/catch into 'bodyParsed'
  let bodyParsed: any = null;
  const contentType = headers.get('content-type') || '';
  
  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    // Decode form data into an object
    try {
      const params = new URLSearchParams(raw);
      bodyParsed = Object.fromEntries(params.entries());
    } catch {
      bodyParsed = null;
    }
  } else {
    // Parse JSON
    try {
      bodyParsed = raw ? JSON.parse(raw) : null;
    } catch {
      bodyParsed = null;
    }
  }

  // 4) Extract event fields with robust fallbacks
  const qp = new URL(req.url).searchParams;
  const force = qp.get('force') === '1';

  const headerType =
    headers.get('x-whop-event') ||
    headers.get('x-whop-event-type') ||
    headers.get('whop-event') ||
    undefined;

  const bodyType =
    bodyParsed?.type ||
    bodyParsed?.event ||
    bodyParsed?.data?.type ||
    undefined;

  const eventType = headerType ?? bodyType ?? 'unknown';

  const headerCompany =
    headers.get('x-whop-company-id') ||
    headers.get('x-whop-community-id') ||
    undefined;

  const bodyCompany =
    bodyParsed?.data?.community_id ??
    bodyParsed?.data?.company_id ??
    bodyParsed?.community_id ??
    bodyParsed?.company_id ??
    undefined;

  const communityId = headerCompany ?? bodyCompany ?? null;

  const username =
    bodyParsed?.data?.user?.username ??
    bodyParsed?.user?.username ??
    bodyParsed?.data?.username ??
    bodyParsed?.username ??
    null;

  const externalEventId =
    headers.get('x-whop-event-id') ??
    bodyParsed?.id ??
    bodyParsed?.event_id ??
    null;

  console.log('WEBHOOK_HIT_DIAG', { eventType, communityId, username, externalEventId, force });

  // 5) Prepare headers_dump object with only specified keys if present
  const headersDump: Record<string, string> = {};
  const headerKeys = [
    'content-type', 'x-whop-event', 'x-whop-event-type', 'whop-event',
    'x-whop-company-id', 'x-whop-community-id', 'user-agent', 'x-forwarded-for'
  ];
  
  for (const key of headerKeys) {
    const value = headers.get(key);
    if (value) {
      headersDump[key] = value;
    }
  }

  // 6) Insert into public.webhook_events
  const insertRes = await supabase.from("webhook_events").insert({
    event_type: eventType,
    community_id: communityId,
    payload: bodyParsed, // jsonb
    headers_dump: headersDump, // jsonb
    external_event_id: externalEventId,
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
  console.log('WEBHOOK_INSERT_OK', { insertId });

  // 7) Decide to trigger DM
  const allowed = new Set([
    'membership.went_valid',
    'app_membership.went_valid',
    'experience_membership.went_valid',
    'membership_experience_claimed'
  ]);
  const shouldTrigger = force || (allowed.has(eventType) && !!communityId);

  console.log('WEBHOOK_DECISION', { shouldTrigger });

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

  // 8) If shouldTrigger, call sendWelcomeDM
  try {
    const dmResult = await sendWelcomeDM({
      communityId: communityId!,
      username: username,
      eventId: externalEventId ?? insertId ?? 'evt_local',
      source: 'webhook',
    });

    console.log('WEBHOOK_DM_RESULT', { 
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
    console.log('WEBHOOK_DM_RESULT', { 
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