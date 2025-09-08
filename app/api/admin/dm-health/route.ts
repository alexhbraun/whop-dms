export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { requireAdminSecret } from "@/lib/admin-auth";
import { recentDmSends } from "@/lib/dm-db";

export async function GET(req: Request) {
  try {
    requireAdminSecret(req);
    const data = await recentDmSends(100);
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    const code = e?.status || 500;
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: code });
  }
}
