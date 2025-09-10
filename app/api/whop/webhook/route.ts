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
    // Use the actual sendWelcomeDM function
    await actualSendWelcomeDM({
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

  // 1) Capture headers + raw body FIRST (never call req.json() before req.text())
  const headersAll = normalizeHeaders(req);
  const contentType = headersAll["content-type"] ?? "";
  const raw = await req.text();

  // 2) Try to parse JSON, but keep raw regardless
  let parsed: any = null;
  let json_ok = false;
  try {
    parsed = JSON.parse(raw);
    json_ok = true;
  } catch {
    parsed = null;
    json_ok = false;
  }

  // 3) Extract event metadata
  const event_type = extractEventType(headersAll, parsed);
  const community_id = extractCommunityId(parsed);
  const username = extractUsername(parsed);
  const external_event_id = extractExternalEventId(parsed);

  // Optional: store a curated header snapshot for debugging
  const header_dump = take(headersAll, [
    "content-type",
    "x-whop-event",
    "x-whop__event",
    "user-agent",
    "x-forwarded-for",
  ]);

  // 4) Persist EVERYTHING into webhook_events so we can always inspect later
  const insertRes = await supabase.from("webhook_events").insert({
    event_type,
    community_id,
    payload: parsed,       // JSONB column
    payload_raw: raw,      // TEXT column (for exact bytes)
    content_type: contentType,
    header_dump,           // JSONB column
    json_ok,
    external_event_id,     // if your table has it; safe to include even if ignored
    received_at: new Date().toISOString(),
  }).select("id").single();

  if (insertRes.error) {
    console.error("WEBHOOK_INSERT_FAIL", insertRes.error);
    // Still return 200 so Whop doesn't retry forever; you can choose 500 if you prefer
    return NextResponse.json(
      { ok: false, step: "insert", error: insertRes.error.message },
      { status: 200 }
    );
  }

  // 5) Decide whether to trigger a DM
  // Fire only for real "new member" events you care about
  const SHOULD_DM = [
    "membership.went_valid",
    "app_membership.went_valid",
    "experience_membership.went_valid",
  ].includes(event_type) && !!community_id;

  if (SHOULD_DM) {
    try {
      await sendWelcomeDM({
        communityId: community_id!,
        username,
        eventId: external_event_id ?? insertRes.data.id, // track both if you have both
        source: "webhook",
      });
    } catch (e: any) {
      console.error("DM_SEND_ERROR", e?.message ?? e);
      // Optionally write a failure row to dm_send_log here, but your real
      // sendWelcomeDM should already do that.
    }
  }

  return NextResponse.json({
    ok: true,
    event_type,
    community_id,
    json_ok,
    inserted: insertRes.data?.id ?? true,
    dm_triggered: SHOULD_DM,
  });
}

// Optional lightweight GET for smoke-probing the route from a browser
export async function GET() {
  return NextResponse.json({ ok: true, probe: "whop-webhook" });
}