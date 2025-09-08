export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { whopSdk } from "@/lib/whop-sdk";

export async function POST(req: Request) {
  try {
    const { toUserIdOrUsername, message } = await req.json();
    if (!toUserIdOrUsername || !message) return NextResponse.json({ ok: false, error: "Missing toUserIdOrUsername or message" }, { status: 400 });

    const agentId = (process.env.WHOP_AGENT_USER_ID ?? process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID ?? "").trim();
    if (!agentId) return NextResponse.json({ ok: false, error: "Missing WHOP_AGENT_USER_ID (or NEXT_PUBLIC_WHOP_AGENT_USER_ID)" }, { status: 500 });

    const companyId = (process.env.WHOP_COMPANY_ID ?? process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ?? "").trim();

    let client = whopSdk.withUser(agentId);
    if (companyId) {
      // some API paths require a company context; this only runs if provided
      // if your SDK version has withCompany, use it; otherwise keep without.
      // @ts-ignore — withCompany may not be typed in older versions
      if (typeof client.withCompany === "function") client = client.withCompany(companyId);
    }

    const result = await client.messages.sendDirectMessageToUser({ toUserIdOrUsername, message });
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
