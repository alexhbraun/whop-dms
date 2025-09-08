export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sendWelcomeDM } from "@/lib/dm";
import { requireAdminSecret } from "@/lib/admin-auth";

export async function POST(req: Request) {
  requireAdminSecret(req);
  try {
    const { to, message, businessId } = await req.json();
    const res = await sendWelcomeDM({
      businessId: businessId || "debug_test",
      toUserIdOrUsername: String(to || ""),
      templateOverride: String(message || "Helper test ✅")
    });
    return NextResponse.json({ ok: true, res });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
