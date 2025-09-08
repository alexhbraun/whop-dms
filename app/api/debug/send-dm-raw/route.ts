export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { requireAdminSecret } from "@/lib/admin-auth";

const DM_URL = "https://api.whop.com/v1/messages/send-direct-message-to-user";

export async function POST(req: Request) {
  requireAdminSecret(req);
  try {
    const { toUserIdOrUsername, message } = await req.json();
    if (!toUserIdOrUsername || !message) {
      return NextResponse.json({ ok: false, error: "Missing toUserIdOrUsername or message" }, { status: 400 });
    }

    const apiKey = (process.env.WHOP_API_KEY ?? "").trim();
    const agent  = (process.env.WHOP_AGENT_USER_ID ?? "").trim();
    const biz    = (process.env.WHOP_COMPANY_ID ?? "").trim();

    if (!apiKey || !agent || !biz) {
      return NextResponse.json({
        ok: false,
        error: "Missing one or more envs: WHOP_API_KEY, WHOP_AGENT_USER_ID, WHOP_COMPANY_ID",
        have: { apiKey: !!apiKey, agent: !!agent, biz: !!biz }
      }, { status: 500 });
    }

    const resp = await fetch(DM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "x-on-behalf-of": agent,
        "x-company-id": biz,
      },
      body: JSON.stringify({ toUserIdOrUsername, message }),
    });

    const text = await resp.text();
    let data: any; try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return NextResponse.json({ ok: resp.ok, status: resp.status, upstream: data }, { status: resp.ok ? 200 : resp.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
