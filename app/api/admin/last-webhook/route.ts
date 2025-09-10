import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

function checkSecret(req: NextRequest): { ok: boolean; error?: string; status?: number } {
  const envSecret = process.env.ADMIN_DASH_SECRET;
  if (!envSecret) {
    return { ok: false, error: "ADMIN_DASH_SECRET not set", status: 500 };
  }

  const headerSecret = req.headers.get("x-admin-secret");
  if (!headerSecret) {
    return { ok: false, error: "x-admin-secret header required", status: 401 };
  }

  if (envSecret.trim() !== headerSecret.trim()) {
    return { ok: false, error: "unauthorized", status: 401 };
  }
  return { ok: true };
}

export async function GET(req: NextRequest) {
  try {
    const auth = checkSecret(req);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const sb = getServiceClient();
    
    const { data: webhooks, error } = await sb
      .from("webhook_events")
      .select(`
        id,
        external_event_id,
        event_type,
        community_id,
        received_at,
        payload
      `)
      .order("received_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ 
        ok: false, 
        error: "Failed to fetch webhooks",
        diag: { error: error.message }
      }, { status: 500 });
    }

    // Extract user info from each webhook payload
    const webhooksWithUsers = webhooks?.map(webhook => {
      const payload = webhook.payload;
      const data = payload?.data || {};
      const user = data.user || {};
      
      return {
        id: webhook.id,
        external_event_id: webhook.external_event_id,
        event_type: webhook.event_type,
        community_id: webhook.community_id,
        received_at: webhook.received_at,
        username: user.username || data.username || null,
        user_id: user.id || data.user_id || null
      };
    }) || [];

    return NextResponse.json({
      ok: true,
      webhooks: webhooksWithUsers
    });

  } catch (error: any) {
    console.error("LAST_WEBHOOK_ERROR", error);
    return NextResponse.json({
      ok: false,
      error: "Internal server error",
      diag: { error: error?.message }
    }, { status: 500 });
  }
}
