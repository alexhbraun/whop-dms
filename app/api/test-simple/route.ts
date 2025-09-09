// app/api/test-simple/route.ts
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "Simple test endpoint is working",
      timestamp: new Date().toISOString()
    }),
    { 
      headers: { "Content-Type": "application/json" },
      status: 200
    }
  );
}
