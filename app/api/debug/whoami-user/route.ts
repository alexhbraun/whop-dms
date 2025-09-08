export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { whopSdk } from "@/lib/whop-sdk";

export async function GET() {
  try {
    const agentId = (process.env.WHOP_AGENT_USER_ID ?? process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID ?? "").trim();
    if (!agentId) return NextResponse.json({ ok: false, error: "Missing WHOP_AGENT_USER_ID (or NEXT_PUBLIC_WHOP_AGENT_USER_ID)" }, { status: 500 });

    const client = whopSdk.withUser(agentId);
    // Simple user read as the agent itself
    const me = await client.users.getUser({ userId: agentId });
    return NextResponse.json({ ok: true, me });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
