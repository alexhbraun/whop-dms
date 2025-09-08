import { NextResponse } from "next/server";
import { getWhopSdk, getAgentAndCompany } from "@/lib/whop-sdk";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { toUserIdOrUsername, message, businessId } = await req.json();
    if (!toUserIdOrUsername || !message || !businessId) {
      return NextResponse.json({ ok: false, error: "Missing toUserIdOrUsername, message, or businessId" }, { status: 400 });
    }

    const { agentUserId } = getAgentAndCompany();
    const whop = getWhopSdk();

    const result = await whop.messages.sendDirectMessageToUser({ 
      toUserIdOrUsername, 
      message
    });
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
