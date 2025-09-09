import { getWhopSdkWithAgent } from "@/lib/whop-sdk";
import { getTemplateForBusiness } from "@/lib/db/templates";
import { getServiceDb } from "@/lib/db/client";
import { logInfo, logError } from "@/lib/log";

// Removed hardcoded env vars - now using getAgentAndCompany()

interface SendOpts {
  businessId: string
  toUser: { username?: string; id?: string }     // at least one required
  message: string
  eventId: string                                // caller provides
  source: 'admin' | 'webhook' | 'debug'
  templateId?: string | null
}

type SendParams = {
  businessId: string;                // new
  toUser?: string;                   // "user_..." or "username" (renamed for compatibility)
  toUserIdOrUsername?: string;       // "user_..." or "username" (keep for backward compatibility)
  customMessage?: string;            // optional direct message body override (renamed for compatibility)
  templateOverride?: string;         // optional direct message body override (keep for backward compatibility)
  eventId?: string;                  // optional event ID for logging
  context?: "onboarding" | "debug";  // context for logging
};

function clean(s?: string | null) {
  return (s ?? "").toString().trim();
}

export async function sendAndLogDM(opts: SendOpts): Promise<{ ok: boolean; status: string; error?: string }> {
  const { businessId, toUser, message, eventId, source, templateId } = opts;
  
  // Determine toUser label (username ?? id)
  const toUserLabel = toUser.username || toUser.id;
  if (!toUserLabel) {
    throw new Error("Either username or id must be provided in toUser");
  }

  let status: "sent" | "failed" = "sent";
  let error: string | null = null;

  try {
    const whop = getWhopSdkWithAgent();
    
    // Send the DM
    await whop.messages.sendDirectMessageToUser({
      toUserIdOrUsername: toUserLabel,
      message,
    });
    
    logInfo("dm.send.ok", { 
      businessId, 
      toUser: toUserLabel, 
      eventId, 
      source 
    });
  } catch (e: any) {
    status = "failed";
    error = e?.message ?? String(e);
    logError("dm.send.fail", { 
      businessId, 
      toUser: toUserLabel, 
      eventId, 
      source,
      error: e?.message 
    });
  }

  // Log to database
  try {
    const db = getServiceDb();
    const preview = message.slice(0, 140);
    
    await db.from("dm_send_log").insert({
      event_id: eventId,
      business_id: businessId,
      to_user: toUserLabel,
      status,
      error,
      message_preview: preview,
      template_id: templateId,
      source,
      created_at: new Date().toISOString()
    });
  } catch (dbError) {
    console.error("Failed to log DM to database:", dbError);
    // Don't throw - we still want HTTP 200 for admin tester
  }

  return { ok: status === "sent", status, error: error || undefined };
}

export async function sendWelcomeDM(params: SendParams) {
  const { businessId, toUser, toUserIdOrUsername, customMessage, templateOverride, eventId, context = "debug" } = params;
  const recipient = clean(toUser || toUserIdOrUsername);
  const messageOverride = customMessage || templateOverride;

  if (!recipient) {
    throw new Error("Recipient is empty: toUser or toUserIdOrUsername must be provided.");
  }

  // Select template scoped by business (fallback to global)
  const tmpl = await getTemplateForBusiness(businessId);
  
  // Check if template exists for business
  if (!tmpl && !messageOverride) {
    logError("dm.onboarding.no_template", { businessId, userId: recipient, eventId });
    throw new Error(`No template found for business ${businessId}`);
  }
  
  const message = (messageOverride ?? tmpl?.message_body ?? "Welcome to the community!");
  const templateId = tmpl?.id ?? null;
  const finalEventId = eventId || `debug_${Date.now()}`;

  // Use the new sendAndLogDM function
  const result = await sendAndLogDM({
    businessId,
    toUser: { username: recipient, id: undefined }, // Assume username for backward compatibility
    message,
    eventId: finalEventId,
    source: context === "onboarding" ? "webhook" : "debug",
    templateId
  });

  return { 
    ok: result.ok, 
    status: result.status, 
    error: result.error, 
    templateId, 
    businessId 
  };
}


