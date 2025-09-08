import { whopSdk } from "@/lib/whop-sdk";
import { getTemplateForBusiness } from "@/lib/db/templates";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const AGENT = (process.env.WHOP_AGENT_USER_ID || "").trim();
const BIZ   = (process.env.WHOP_COMPANY_ID || "").trim();

type SendParams = {
  businessId: string;                // new
  toUserIdOrUsername: string;        // "user_..." or "username"
  templateOverride?: string;         // optional direct message body override
  eventId?: string;                  // optional event ID for logging
};

function clean(s?: string | null) {
  return (s ?? "").toString().trim();
}

export async function sendWelcomeDM(params: SendParams) {
  const { businessId, toUserIdOrUsername, templateOverride, eventId } = params;
  const recipient = clean(toUserIdOrUsername);

  if (!recipient) {
    throw new Error("Recipient is empty: toUserIdOrUsername was falsy/blank.");
  }
  if (!AGENT) {
    throw new Error("WHOP_AGENT_USER_ID is not set.");
  }

  // Select template scoped by business (fallback to global)
  const tmpl = await getTemplateForBusiness(businessId);
  const message = (templateOverride ?? tmpl?.message_body ?? "Welcome to the community!");

  // Try sending
  let status: "sent" | "failed" = "sent";
  let error: string | null = null;
  let templateId: string | null = tmpl?.id ?? null;

  try {
    let client: any = whopSdk.withUser(AGENT);
    if (BIZ && typeof client.withCompany === "function") {
      client = client.withCompany(BIZ);
    }

    await client.messages.sendDirectMessageToUser({
      toUserIdOrUsername: recipient,
      message
    });
  } catch (e: any) {
    status = "failed";
    error = e?.message ?? String(e);
  }

  // Log with richer context
  const preview = message.slice(0, 140);
  const supabase = getSupabaseClient();
  await supabase.from("dm_send_log").insert({
    event_id: eventId || `debug_${Date.now()}`,
    to_user: toUserIdOrUsername,
    status,
    error,
    message_preview: preview,
    business_id: businessId,            // NEW
    template_id: templateId             // NEW
  });

  return { ok: status === "sent", status, error, templateId, businessId };
}


