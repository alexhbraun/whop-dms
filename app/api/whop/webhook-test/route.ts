// app/api/whop/webhook-test/route.ts
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "Webhook endpoint is reachable",
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method
    }),
    { 
      headers: { "Content-Type": "application/json" },
      status: 200
    }
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  
  return new Response(
    JSON.stringify({
      ok: true,
      message: "Webhook POST endpoint is reachable",
      timestamp: new Date().toISOString(),
      receivedData: body,
      headers: Object.fromEntries(req.headers.entries())
    }),
    { 
      headers: { "Content-Type": "application/json" },
      status: 200
    }
  );
}
