import { NextResponse } from "next/server";
import { getWhopSdk, getAgentAndCompany } from "@/lib/whop-sdk";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { agentUserId } = getAgentAndCompany();
    const whop = getWhopSdk();
    
    // Simple user read as the agent itself
    const me = await whop.users.getUser({ userId: agentUserId });
    return NextResponse.json({ ok: true, me });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
