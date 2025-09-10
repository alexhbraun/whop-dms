// app/api/whop/webhook/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeDM } from "@/lib/dm"; // keep your current helper

type WhopWebhook = {
  id?: string;
  type?: string;
  data?: {
    community_id?: string | null;
    business_id?: string | null; // older naming
    user?: { username?: string | null; id?: string | null } | null;
    // ... other fields ignored
  } | null;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function insertWebhookRow(body: any) {
  const sb = getSupabase();
  const type = (body?.type ?? "unknown") as string;
  const communityId =
    body?.data?.community_id ??
    body?.data?.business_id ?? // fallback for older field name
    null;

  const row = {
    event_type: type,
    community_id: communityId,
    payload: body, // full JSON
    received_at: new Date().toISOString(),
  };

  const { error } = await sb.from("webhook_events").insert(row);
  if (error) throw new Error(`WEBHOOK_INSERT_FAIL: ${error.message}`);

  return { type, communityId };
}

function isTriggerEvent(t?: string | null) {
  return t === "membership.went_valid" ||
         t === "membership_experience_claimed" ||
         t === "app_membership.went_valid";
}

export async function POST(req: NextRequest) {
  try {
    // Always parse JSON body
    const body = (await req.json()) as WhopWebhook;
    console.log("WEBHOOK_HIT_RAW", {
      ts: Date.now(),
      contentType: req.headers.get("content-type"),
      preview: typeof body === "object" ? { type: body?.type, dataKeys: Object.keys(body?.data ?? {}) } : typeof body,
    });

    // Insert raw webhook row for auditing
    const { type, communityId } = await insertWebhookRow(body);
    console.log("WEBHOOK_ROW_INSERTED", { type, communityId });

    // Only trigger DM on known events
    if (isTriggerEvent(type) && communityId) {
      const username =
        body?.data?.user?.username ??
        body?.data?.user?.id ??
        null;

      // Guard: we need someone to DM
      if (username) {
        console.log("DM_PIPELINE_START", { type, communityId, to: username });
        // Your helper already handles template lookup + logging to dm_send_log
        await sendWelcomeDM({
          businessId: communityId, // your code treats this as community id internally
          toUserIdOrUsername: username,
          source: "webhook",
        });
        console.log("DM_PIPELINE_OK", { type, communityId, to: username });
      } else {
        console.warn("DM_PIPELINE_SKIP_NO_USER", { type, communityId });
      }
    } else {
      console.log("WEBHOOK_NOOP", { type, communityId });
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("WEBHOOK_ERROR", { msg: err?.message || String(err) });
    return new Response(JSON.stringify({ ok: false, error: "bad_request" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
}