// app/api/debug/test-webhook-public/route.ts
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
import { sendWelcomeDM } from "@/lib/dm";
import { DM_ENABLED } from "@/lib/feature-flags";
import { hasSentForEvent } from "@/lib/dm-db";

export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "Test webhook endpoint is working",
      timestamp: new Date().toISOString()
    }),
    { 
      headers: { "Content-Type": "application/json" },
      status: 200
    }
  );
}

export async function POST(req: Request) {
  try {
    const { username, businessId } = await req.json();
    
    if (!username || !businessId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing username or businessId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Simulate a membership_went_valid webhook event
    const eventId = `test_webhook_${Date.now()}`;
    const memberId = `mem_test_${Date.now()}`;
    
    console.log(`[TEST-WEBHOOK] Testing with eventId: ${eventId}, username: ${username}, businessId: ${businessId}`);

    // Check if DM is enabled
    if (!DM_ENABLED) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "DM onboarding is disabled",
          dmEnabled: false,
          eventId,
          username,
          businessId
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if already processed (idempotency)
    const already = await hasSentForEvent(eventId);
    if (already) {
      return new Response(
        JSON.stringify({
          ok: true,
          message: "Event already processed",
          eventId,
          username,
          businessId
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Try to send the DM directly
    try {
      const result = await sendWelcomeDM({
        businessId: businessId,
        toUserIdOrUsername: username,
        templateOverride: `🎉 Test DM from Nexo! Welcome to the community! This is a test message.`,
        eventId: eventId
      });
      
      console.log(`[TEST-WEBHOOK] DM send result:`, result);
      
      return new Response(
        JSON.stringify({
          ok: true,
          message: "DM sent successfully",
          eventId,
          username,
          businessId,
          dmResult: result
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (dmError: any) {
      console.error(`[TEST-WEBHOOK] DM send failed:`, dmError);
      
      return new Response(
        JSON.stringify({
          ok: false,
          error: "DM send failed",
          dmError: dmError?.message || "Unknown DM error",
          eventId,
          username,
          businessId
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (e: any) {
    console.error(`[TEST-WEBHOOK] General error:`, e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
