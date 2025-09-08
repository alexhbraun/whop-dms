export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = (process.env.WHOP_API_KEY ?? "").trim();
  const agent  = (process.env.WHOP_AGENT_USER_ID ?? "").trim();
  const biz    = (process.env.WHOP_COMPANY_ID ?? "").trim();

  if (!apiKey || !agent || !biz) {
    return NextResponse.json(
      { ok:false, error:"Missing envs", have:{ apiKey:!!apiKey, agent:!!agent, biz:!!biz } },
      { status: 500 }
    );
  }

  const resp = await fetch("https://api.whop.com/public-graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "x-on-behalf-of": agent,
      "x-company-id": biz,
    },
    body: JSON.stringify({ query: "query { currentUser { id username } }" }),
  });

  let data: any;
  try { data = await resp.json(); } catch { data = { raw: await resp.text() }; }

  return NextResponse.json({ ok: resp.ok, status: resp.status, data }, { status: resp.status });
}
