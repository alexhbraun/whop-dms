import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeDM } from "@/lib/dm";

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Try several header names providers may use for the event type.
function readEventType(req: NextRequest, body: any): string {
  const h = req.headers;
  const fromHeader =
    h.get("whop-event") ||
    h.get("x-whop-event") ||
    h.get("whop-event-type") ||
    h.get("x-whop-event-type") ||
    h.get("x-event-type") ||
    h.get("event-type");
  const fromBody =
    body?.type ||
    body?.event ||
    body?.event_type ||
    body?.eventType ||
    body?.["detail-type"];
  return (fromHeader || fromBody || "unknown").toString();
}

// Accept multiple id fields (older/newer shapes).
function readCommunityId(body: any): string | null {
  return (
    body?.data?.community_id ??
    body?.data?.business_id ??
    body?.community_id ??
    body?.business_id ??
    body?.company_id ??        // seen in your log
    body?.workspace_id ??
    null
  );
}

function readUsername(body: any): string | null {
  return (
    body?.data?.user?.username ??
    body?.data?.user?.id ??
    body?.user?.username ??
    body?.user?.id ??
    null
  );
}

function isTriggerEvent(type: string) {
  return (
    type === "membership.went_valid" ||
    type === "membership_experience_claimed" ||
    type === "app_membership.went_valid" ||
    type === "payment.succeeded" // allow; harmless if no username
  );
}

export async function POST(req: NextRequest) {
  // Read raw text first so we can always persist something
  const raw = await req.text();
  let body: any;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = { _raw: raw, _parse_error: true };
  }

  const eventType = readEventType(req, body);
  const communityId = readCommunityId(body);

  console.log("WEBHOOK_HIT_V2", {
    ts: Date.now(),
    contentType: req.headers.get("content-type"),
    eventType,
    hasData: !!body?.data,
    communityId,
    topLevelKeys: Object.keys(body || {}),
  });

  // Insert full payload (jsonb) for audit/debug
  const row = {
    event_type: eventType,
    community_id: communityId,
    payload: body, // ALWAYS store what we parsed (or {_raw})
    received_at: new Date().toISOString(),
  };

  const supa = sb();
  const { error: insertErr } = await supa.from("webhook_events").insert(row);
  if (insertErr) {
    console.error("WEBHOOK_INSERT_FAIL", { code: insertErr.code, message: insertErr.message });
    return new Response(JSON.stringify({ ok: false, error: "insert_failed" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Try to send DM if it looks like a new-member event
  if (isTriggerEvent(eventType) && communityId) {
    const username = readUsername(body);
    if (username) {
      try {
        console.log("DM_PIPELINE_START", { eventType, communityId, to: username });
        await sendWelcomeDM({
          businessId: communityId,          // your helper treats this as community id
          toUserIdOrUsername: username,
          source: "webhook",
        });
        console.log("DM_PIPELINE_OK", { eventType, communityId, to: username });
      } catch (e: any) {
        console.error("DM_PIPELINE_FAIL", { message: e?.message || String(e) });
      }
    } else {
      console.log("DM_SKIP_NO_USER", { eventType, communityId });
    }
  } else {
    console.log("WEBHOOK_NOOP_V2", { eventType, communityId });
  }

  return Response.json({ ok: true });
}