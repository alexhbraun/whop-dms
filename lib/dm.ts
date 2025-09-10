import { getWhopSdkWithAgent } from "@/lib/whop-sdk";
import { getTemplateForCommunity } from "@/lib/db/templates";
import { getServiceDb } from "@/lib/db/client";
import { logInfo, logError } from "@/lib/log";

// Removed hardcoded env vars - now using getAgentAndCompany()

interface SendOpts {
  businessId: string
  communityId?: string                           // NEW preferred
  toUser: { username?: string; id?: string }     // at least one required
  message: string
  eventId: string                                // caller provides
  source: 'admin' | 'webhook' | 'debug' | 'replay'
  templateId?: string | null
}

type SendParams = {
  businessId: string;                // new
  communityId?: string;              // NEW preferred
  toUser?: string;                   // "user_..." or "username" (renamed for compatibility)
  toUserIdOrUsername?: string;       // "user_..." or "username" (keep for backward compatibility)
  customMessage?: string;            // optional direct message body override (renamed for compatibility)
  templateOverride?: string;         // optional direct message body override (keep for backward compatibility)
  eventId?: string;                  // optional event ID for logging
  context?: "onboarding" | "debug" | "replay";  // context for logging
};

function clean(s?: string | null) {
  return (s ?? "").toString().trim();
}

export async function sendAndLogDM(opts: SendOpts): Promise<{ ok: boolean; status: string; error?: string }> {
  const { businessId, communityId, toUser, message, eventId, source, templateId } = opts;
  const effectiveCommunityId = communityId ?? businessId;
  
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
      business_id: effectiveCommunityId, // Store effective community id as business_id for now
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
  const { businessId, communityId, toUser, toUserIdOrUsername, customMessage, templateOverride, eventId, context = "debug" } = params;
  const recipient = clean(toUser || toUserIdOrUsername);
  const messageOverride = customMessage || templateOverride;
  const effectiveCommunityId = communityId ?? businessId;

  console.log("DM_PIPELINE_START", { 
    communityId: effectiveCommunityId, 
    toUser: recipient, 
    eventId: eventId || `debug_${Date.now()}`,
    context
  });

  if (!recipient) {
    console.log("DM_PIPELINE_SKIP", { 
      reason: "no_recipient", 
      communityId: effectiveCommunityId, 
      eventId: eventId || `debug_${Date.now()}` 
    });
    throw new Error("Recipient is empty: toUser or toUserIdOrUsername must be provided.");
  }

  // Select template scoped by community (fallback to global)
  const tmpl = await getTemplateForCommunity(effectiveCommunityId);
  
  // Check if template exists for community
  if (!tmpl && !messageOverride) {
    console.log("DM_PIPELINE_SKIP", { 
      reason: "no_template", 
      communityId: effectiveCommunityId, 
      eventId: eventId || `debug_${Date.now()}` 
    });
    logError("dm.onboarding.no_template", { businessId: effectiveCommunityId, userId: recipient, eventId });
    throw new Error(`No template found for community ${effectiveCommunityId}`);
  }
  
  const message = (messageOverride ?? tmpl?.content ?? "Welcome to the community!");
  const templateId = tmpl?.id ?? null;
  const finalEventId = eventId || `debug_${Date.now()}`;

  // Use the new sendAndLogDM function
  try {
    const result = await sendAndLogDM({
      businessId,
      communityId: effectiveCommunityId,
      toUser: { username: recipient, id: undefined }, // Assume username for backward compatibility
      message,
      eventId: finalEventId,
      source: context === "onboarding" ? "webhook" : (context === "replay" ? "replay" : "admin"),
      templateId
    });

    if (result.ok) {
      console.log("DM_PIPELINE_OK", { 
        communityId: effectiveCommunityId, 
        toUser: recipient, 
        eventId: finalEventId 
      });
    } else {
      console.error("DM_PIPELINE_FAIL", { 
        communityId: effectiveCommunityId, 
        toUser: recipient, 
        eventId: finalEventId, 
        error: result.error 
      });
    }

    return { 
      ok: result.ok, 
      status: result.status, 
      error: result.error, 
      templateId, 
      businessId: effectiveCommunityId // Return effective community id
    };
  } catch (error: any) {
    console.error("DM_PIPELINE_FAIL", { 
      communityId: effectiveCommunityId, 
      toUser: recipient, 
      eventId: finalEventId, 
      error: error?.message 
    });
    throw error;
  }
}


