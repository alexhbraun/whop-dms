import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id } = body; // internal webhook_events.id

    if (!id) {
      return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Look up the stored event
    const { data, error } = await supabase
      .from("webhook_events")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "event not found" }, { status: 404 });
    }

    // 2. Re-invoke the same internal handler you use for /api/whop/webhook
    //    For now, we'll simulate the webhook processing
    const result = { processed: true, eventType: data.event_type, communityId: data.community_id };

    // 3. Log and return
    return NextResponse.json({ ok: true, replayed: id, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}