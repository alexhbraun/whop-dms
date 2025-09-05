export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { whopSdk } from "@/lib/whop-sdk";

export async function POST(req: Request) {
  try {
    const { toUserIdOrUsername, message } = await req.json();

    if (!toUserIdOrUsername || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing toUserIdOrUsername or message" },
        { status: 400 }
      );
    }

    const agentId = (process.env.WHOP_AGENT_USER_ID ?? "").trim();
    if (!agentId) {
      return NextResponse.json(
        { ok: false, error: "Missing WHOP_AGENT_USER_ID env var" },
        { status: 500 }
      );
    }

    // ✅ Send as the Agent user (generates user token under the hood)
    const client = whopSdk.withUser(agentId);
    const result = await client.messages.sendDirectMessageToUser({
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
