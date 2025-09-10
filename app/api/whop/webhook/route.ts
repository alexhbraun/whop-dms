import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeDM } from "@/lib/dm";
import { getWhopSdk } from "@/lib/whop-sdk"; // this existed earlier in the project

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

function headerEventType(req: NextRequest) {
  const h = req.headers;
  return (
    h.get("whop-event") ||
    h.get("x-whop-event") ||
    h.get("whop-event-type") ||
    h.get("x-whop-event-type") ||
    h.get("x-event-type") ||
    h.get("event-type") ||
    null
  );
}

function inferEventType(req: NextRequest, body: any): string {
  return (
    headerEventType(req) ||
    body?.type ||
    body?.event ||
    body?.event_type ||
    body?.eventType ||
    "unknown"
  ).toString();
}

function inferCommunityId(body: any): string | null {
  // Try several common fields
  return (
    body?.data?.community_id ??
    body?.data?.business_id ??
    body?.community_id ??
    body?.business_id ??
    body?.company_id ??    // present in your Vercel sample
    null
  );
}

function extractUsername(body: any): string | null {
  return (
    body?.data?.user?.username ??
    body?.user?.username ??
    null
  );
}

function extractUserId(body: any): string | null {
  return (
    body?.data?.user?.id ??
    body?.user_id ??
    null
  );
}

function extractMembershipId(body: any): string | null {
  return (
    body?.data?.membership_id ??
    body?.membership_id ??
    null
  );
}

function isJoinLike(type: string) {
  return (
    type === "membership.went_valid" ||
    type === "app_membership.went_valid" ||
    type === "membership_experience_claimed" ||
    type === "payment.succeeded" // allow; we will only send if we can resolve a username
  );
}

async function resolveUsernameViaSdk(body: any): Promise<string | null> {
  const sdk = getWhopSdk();
  // Try to get username from user_id
  const userId = extractUserId(body);
  if (userId) {
    try {
      const u = await sdk.users.getUser({ userId });
      return u?.username || u?.id || null;
    } catch (_) {
      // If user lookup fails, return the userId as fallback
      return userId;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  let body: any;
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = { _raw: raw, _parse_error: true }; }

  const eventType = inferEventType(req, body);
  const communityId = inferCommunityId(body);

  // Attach a small header snapshot inside payload for diagnostics
  const hdr: Record<string, string> = {};
  req.headers.forEach((v, k) => { hdr[k] = v; });
  body._hdr = hdr;

  const supa = sb();
  const insertRow = {
    event_type: eventType,
    community_id: communityId,
    payload: body,
    received_at: new Date().toISOString(),
  };

  const ins = await supa.from("webhook_events").insert(insertRow).select("id").single();
  if (ins.error) {
    console.error("WEBHOOK_INSERT_FAIL", { code: ins.error.code, message: ins.error.message });
    return Response.json({ ok: false, error: "insert_failed" }, { status: 400 });
  }

  // Only attempt DM for relevant events and if we can resolve a recipient
  if (isJoinLike(eventType) && communityId) {
    let to = extractUsername(body);
    if (!to) {
      to = await resolveUsernameViaSdk(body);
    }
    if (to) {
      try {
        console.log("DM_SEND_ATTEMPT", { eventType, communityId, to });
        await sendWelcomeDM({
          businessId: communityId,             // treated as community id in our helpers
          toUserIdOrUsername: to,
          source: "webhook",
        });
        console.log("DM_SEND_OK", { to });
      } catch (e: any) {
        console.error("DM_SEND_FAIL", { err: e?.message || String(e) });
      }
    } else {
      console.log("DM_SKIP_NO_RECIPIENT", { eventType, communityId });
    }
  } else {
    console.log("WEBHOOK_NOOP", { eventType, communityId });
  }

  return Response.json({ ok: true });
}