export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getServiceDb } from "@/lib/db/client";

function checkSecret(req: Request): { ok: boolean; error?: string; status?: number } {
  const envSecret = process.env.ADMIN_DASH_SECRET;
  
  if (!envSecret) {
    return { ok: false, error: "ADMIN_DASH_SECRET not set", status: 500 };
  }
  
  // Check header first, then query param
  const headerSecret = req.headers.get("x-admin-secret");
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  
  const providedSecret = headerSecret || querySecret;
  
  if (!providedSecret) {
    return { ok: false, error: "unauthorized", status: 401 };
  }
  
  if (envSecret.trim() !== providedSecret.trim()) {
    return { ok: false, error: "unauthorized", status: 401 };
  }
  
  return { ok: true };
}

export async function GET(req: Request) {
  try {
    const auth = checkSecret(req);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const db = getServiceDb();
    const { data, error } = await db
      .from("dm_send_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (e: any) {
    console.error("DM health endpoint error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
