import { whopSdk } from "@/lib/whop-sdk";

const AGENT = (process.env.WHOP_AGENT_USER_ID || "").trim();
const BIZ   = (process.env.WHOP_COMPANY_ID || "").trim();

function clean(s?: string | null) {
  return (s ?? "").toString().trim();
}

export async function sendWelcomeDM(toUserIdOrUsername: string, message: string) {
  const recipient = clean(toUserIdOrUsername);
  const text = clean(message);

  if (!recipient) {
    throw new Error("Recipient is empty: toUserIdOrUsername was falsy/blank.");
  }
  if (!AGENT) {
    throw new Error("WHOP_AGENT_USER_ID is not set.");
  }

  let client: any = whopSdk.withUser(AGENT);
  if (BIZ && typeof client.withCompany === "function") {
    client = client.withCompany(BIZ);
  }

  return client.messages.sendDirectMessageToUser({
    toUserIdOrUsername: recipient,
    message: text || "👋",
  });
}


