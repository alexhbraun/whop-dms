import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_SECRET  = process.env.ADMIN_DASH_SECRET!;

export async function GET(req: NextRequest) {
  try {
    // auth: header or ?secret
    const url = new URL(req.url);
    const qpSecret = url.searchParams.get("secret");
    const hdrSecret = req.headers.get("x-admin-secret");
    const secret = qpSecret ?? hdrSecret;
    if (!secret || secret !== ADMIN_SECRET) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // parse params safely
    const limitParam = url.searchParams.get("limit");
    const limit = Math.max(
      1,
      Math.min(100, Number.parseInt(limitParam ?? "10", 10) || 10)
    );
    const keysOnly = (url.searchParams.get("keysOnly") ?? "0") === "1";

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const { data, error } = await supabase
      .from("webhook_events")
      .select("id, created_at, event_type, external_event_id, community_id, content_type, raw_headers, raw_payload")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message ?? String(error) }, { status: 500 });
    }

    const rows = (data ?? []).map(r =>
      keysOnly
        ? {
            ...r,
            raw_headers: r.raw_headers ? Object.keys(r.raw_headers) : null,
            raw_payload: r.raw_payload ? Object.keys(r.raw_payload) : null,
          }
        : r
    );

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
