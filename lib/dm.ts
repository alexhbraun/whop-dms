import { getWhopSdkWithAgent } from "@/lib/whop-sdk";
import { getTemplateForBusiness } from "@/lib/db/templates";
import { createClient } from "@supabase/supabase-js";
import { logInfo, logError } from "@/lib/log";

function getSupabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Removed hardcoded env vars - now using getAgentAndCompany()

type SendParams = {
  businessId: string;                // new
  toUserIdOrUsername: string;        // "user_..." or "username"
  templateOverride?: string;         // optional direct message body override
  eventId?: string;                  // optional event ID for logging
  context?: "onboarding" | "debug";  // context for logging
};

function clean(s?: string | null) {
  return (s ?? "").toString().trim();
}

export async function sendWelcomeDM(params: SendParams) {
  const { businessId, toUserIdOrUsername, templateOverride, eventId, context = "debug" } = params;
  const recipient = clean(toUserIdOrUsername);

  if (!recipient) {
    throw new Error("Recipient is empty: toUserIdOrUsername was falsy/blank.");
  }

  // Select template scoped by business (fallback to global)
  const tmpl = await getTemplateForBusiness(businessId);
  
  // Check if template exists for business
  if (!tmpl && !templateOverride) {
    logError("dm.onboarding.no_template", { businessId, userId: recipient, eventId });
    throw new Error(`No template found for business ${businessId}`);
  }
  
  const message = (templateOverride ?? tmpl?.message_body ?? "Welcome to the community!");

  // Try sending
  let status: "sent" | "failed" = "sent";
  let error: string | null = null;
  let templateId: string | null = tmpl?.id ?? null;

  logInfo("dm.send.attempt", { 
    businessId, 
    toUser: recipient, 
    templateId, 
    eventId, 
    context 
  });

  try {
    const whop = getWhopSdkWithAgent();
    
    // Use withUser() to set x-on-behalf-of header for DM sending
    await whop.messages.sendDirectMessageToUser({
      toUserIdOrUsername: recipient,
      message,
    });
    
    logInfo("dm.send.ok", { 
      businessId, 
      toUser: recipient, 
      templateId, 
      eventId, 
      context 
    });
  } catch (e: any) {
    status = "failed";
    error = e?.message ?? String(e);
    logError("dm.send.fail", { 
      businessId, 
      toUser: recipient, 
      templateId, 
      eventId, 
      context,
      error: e?.message 
    });
  }

  // Log with richer context including context field
  const preview = message.slice(0, 140);
  const supabase = getSupabaseClient();
  await supabase.from("dm_send_log").insert({
    event_id: eventId || `debug_${Date.now()}`,
    to_user: toUserIdOrUsername,
    status,
    error,
    message_preview: preview,
    business_id: businessId,
    template_id: templateId,
    context: context  // NEW: distinguish between onboarding and debug
  });

  return { ok: status === "sent", status, error, templateId, businessId };
}


