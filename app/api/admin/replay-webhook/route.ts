import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Reuse the same DM helper the real webhook path uses.
// If your helper path differs, fix the import below.
import { sendWelcomeDM } from "@/lib/dm";

// --- small util: safe get by path
function pick(obj: any, path: string): any {
  return path.split(".").reduce((acc, k) => (acc && k in acc ? acc[k] : undefined), obj);
}

// Try to extract a username or user id from various event payload shapes.
function extractUserFromPayload(eventType: string, payload: any): { username?: string; userId?: string } {
  // Common patterns we've seen in Whop webhooks and in our smoke events
  const candidates = [
    "data.user.username",
    "user.username",
    "member.user.username",
    "data.user_id",
    "user.id",
    "member.user.id",
  ];

  for (const p of candidates) {
    const v = pick(payload, p);
    if (typeof v === "string" && v.trim().length) {
      if (p.endsWith("username")) return { username: v.trim() };
      return { userId: v.trim() };
    }
  }
  return {};
}

export async function POST(req: Request) {
  try {
    const { id, externalEventId, dryRun } = await req.json?.() ?? {};

    if (!id && !externalEventId) {
      return NextResponse.json({ ok: false, error: "missing id or externalEventId" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1) Load the stored event
    const q = supabase.from("webhook_events").select("*").limit(1);
    const { data: rows, error } = id
      ? await q.eq("id", id)
      : await q.eq("external_event_id", externalEventId);

    if (error) {
      return NextResponse.json({ ok: false, error: "db_error", details: error.message }, { status: 500 });
    }
    const row = rows?.[0];
    if (!row) {
      return NextResponse.json({ ok: false, error: "event_not_found" }, { status: 404 });
    }

    // 2) Derive community + recipient from row
    const communityId: string | undefined = row.community_id || row.business_id || undefined;
    const eventType: string = row.event_type || "unknown";
    const payload = row.payload || {};

    const who = extractUserFromPayload(eventType, payload);
    const to = who.username || who.userId; // sendWelcomeDM accepts username or user id

    const preview = { communityId, eventType, to, fromRowId: row.id, externalEventId: row.external_event_id };

    // If dry run: just show what would be sent
    if (dryRun) {
      return NextResponse.json({ ok: true, mode: "dryRun", preview });
    }

    if (!communityId) {
      return NextResponse.json({ ok: false, error: "missing_community_id_on_row", preview }, { status: 400 });
    }
    if (!to) {
      return NextResponse.json({ ok: false, error: "missing_user_in_payload", preview }, { status: 400 });
    }

    // 3) Call the SAME helper the live webhook path uses
    //    This function should already log into dm_send_log with source='replay'
    try {
      const res = await sendWelcomeDM({
        businessId: communityId,            // helper maintained backwards-compatible
        toUserIdOrUsername: to,
        eventId: row.external_event_id ?? `replay_${row.id}`,
        source: "replay",
      });

      if (res.alreadyLogged) {
        return NextResponse.json({ ok: true, sent: false, reason: "duplicate", preview, result: res });
      }

      return NextResponse.json({ ok: true, sent: res.ok, reason: res.ok ? "sent" : "failed", preview, result: res });
    } catch (sendErr: any) {
      return NextResponse.json({ ok: true, sent: false, reason: "error", error: sendErr?.message, preview });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
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