export const runtime = "nodejs";
export async function GET() {
  const apiKey = (process.env.WHOP_API_KEY ?? "").trim();
  const agent  = (process.env.WHOP_AGENT_USER_ID ?? "").trim();
  const biz    = (process.env.WHOP_COMPANY_ID ?? "").trim();
  return new Response(JSON.stringify({
    have: { apiKey: !!apiKey, agent: !!agent, biz: !!biz },
    previews: {
      apiKey: apiKey ? apiKey.slice(0,4)+"…("+apiKey.length+")" : null,
      agent:  agent ? agent.slice(0,8)+"…("+agent.length+")" : null,
      biz:    biz ? biz : null
    }
  }), { headers: { "Content-Type": "application/json" }});
}
