export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sendWelcomeDM } from "@/lib/dm";

export async function POST(req: Request) {
  try {
    const { to, message } = await req.json();
    const res = await sendWelcomeDM(String(to || ""), String(message || "Helper test ✅"));
    return NextResponse.json({ ok: true, res });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
