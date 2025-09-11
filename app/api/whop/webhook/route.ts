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

  // At the very top, read headers and content type
  const contentType = req.headers.get('content-type') ?? null;
  const headersDump = Object.fromEntries(req.headers.entries());

  // Non-destructive parse
  let rawText: string;
  let rawJson: any = null;

  if (contentType?.includes('json')) {
    try {
      rawJson = await req.json();
      rawText = JSON.stringify(rawJson);
    } catch {
      rawText = await req.text();
    }
  } else {
    rawText = await req.text();
    try {
      rawJson = JSON.parse(rawText);
    } catch {
      // Keep rawJson as null if parsing fails
    }
  }

  // Derive best-effort fields (do not throw if missing; allow nulls)
  const externalEventId = rawJson?.id ?? rawJson?.event_id ?? null;
  const eventType = rawJson?.type ?? rawJson?.event_type ?? null;
  const communityId = rawJson?.data?.community_id ?? rawJson?.company_id ?? rawJson?.business_id ?? rawJson?.data?.company_id ?? null;
  const username = rawJson?.data?.user?.username ?? rawJson?.user?.username ?? null;

  // Console breadcrumbs
  console.log("WEBHOOK_RAW", { 
    ts: Date.now(), 
    contentType, 
    eventType, 
    externalEventId, 
    communityId, 
    payloadKeys: rawJson ? Object.keys(rawJson) : null 
  });

  // Insert one row into webhook_events
  try {
    const { error: insertError } = await supabase.from("webhook_events").insert({
      event_type: eventType,
      external_event_id: externalEventId,
      community_id: communityId,
      raw_payload: rawJson ?? (rawText ? JSON.parse(rawText) : null),
      raw_headers: headersDump,
      content_type: contentType,
      source: 'webhook'
    });

    if (insertError) {
      // If unique violation on external_event_id, swallow (idempotent) and continue
      if (insertError.code === '23505') {
        console.log("WEBHOOK_DUPLICATE", { externalEventId, eventType, communityId });
      } else {
        console.error("WEBHOOK_INSERT_FAIL", insertError);
        return NextResponse.json(
          { ok: false, step: "insert", error: insertError.message },
          { status: 200 }
        );
      }
    }

    console.log("WEBHOOK_ROW", { 
      ts: Date.now(), 
      inserted: true, 
      eventType, 
      communityId, 
      externalEventId 
    });
  } catch (e: any) {
    console.error("WEBHOOK_INSERT_EXCEPTION", e);
    // Continue with DM pipeline even if insert fails
  }

  // Continue with existing DM pipeline flow
  const qp = new URL(req.url).searchParams;
  const force = qp.get('force') === '1';

  // For forced tests, require REAL values and reject placeholders
  if (force) {
    const hasPlaceholders = (s?: string | null) => !!(s && (s.includes('<') || s.includes('>')));
    if (hasPlaceholders(communityId) || hasPlaceholders(username)) {
      return NextResponse.json({
        ok: false,
        error: 'forced_test_requires_real_values',
        detail: {
          communityId: hasPlaceholders(communityId) ? 'contains_placeholders' : 'ok',
          username: hasPlaceholders(username) ? 'contains_placeholders' : 'ok'
        }
      }, { status: 400 });
    }
  }

  console.log('WEBHOOK_HIT_DIAG', { eventType, communityId, username, externalEventId, force });

  // Decide to trigger DM
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
      externalEventId
    });
  }

  // If shouldTrigger, call sendWelcomeDM
  try {
    const dmResult = await sendWelcomeDM({
      communityId: communityId!,
      username: username,
      eventId: externalEventId ?? 'evt_local',
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