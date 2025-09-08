// app/api/admin/test-webhook/route.ts
import { NextResponse } from "next/server";
import { logInfo, logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.NEXT_PUBLIC_ADMIN_DASH_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { businessId, username } = await req.json();
  if (!businessId || !username) {
    return NextResponse.json({ ok: false, error: "missing businessId/username" }, { status: 400 });
  }

  try {
    // reuse your existing webhook code path
    const payload = {
      id: `evt_admin_test_${Date.now()}`,
      type: "member.created",
      data: {
        business_id: businessId,
        experience_id: "exp_admin_test",
        member_id: `mem_admin_test_${Date.now()}`,
        user: { username },
      },
    };

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/whop/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));
    logInfo("admin test webhook", { status: res.status, body });

    return NextResponse.json({ ok: res.ok, status: res.status, upstream: body });
  } catch (e: any) {
    logError("admin test webhook error", { e: e?.message });
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}
