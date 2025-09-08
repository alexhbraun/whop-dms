import { NextResponse } from "next/server";
import { getWhopSdk, getAgentAndCompany } from "@/lib/whop-sdk";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { toUserIdOrUsername, message, businessId } = await req.json();

    if (!toUserIdOrUsername || !message || !businessId) {
      return NextResponse.json(
        { ok: false, error: "Missing toUserIdOrUsername, message, or businessId" },
        { status: 400 }
      );
    }

    const { agentUserId } = getAgentAndCompany();
    const whop = getWhopSdk();

    // Send as the Agent user using server-side app key
    const result = await whop.messages.sendDirectMessageToUser({
      toUserIdOrUsername,
      message,
    });

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error("DM send error:", err?.message);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
