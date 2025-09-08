export const runtime = "nodejs";
export async function GET(req: Request) {
  const url = new URL(req.url);
  // allow overriding via ?agent= to test a clean value without redeploy
  const src = (url.searchParams.get("agent")
    ?? process.env.WHOP_AGENT_USER_ID
    ?? "").toString();

  const codes = Array.from(src).map(ch => ch.charCodeAt(0));
  const hex   = Array.from(src).map(ch => ch.charCodeAt(0).toString(16).padStart(2,"0"));
  return new Response(JSON.stringify({
    raw: src,
    length: src.length,
    codes,
    hex
  }), { headers: { "Content-Type":"application/json" }});
}
