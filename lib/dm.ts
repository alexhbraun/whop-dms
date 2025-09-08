import { whopSdk } from "@/lib/whop-sdk";

const AGENT = process.env.WHOP_AGENT_USER_ID!;
const BIZ   = process.env.WHOP_COMPANY_ID!;

export async function sendWelcomeDM(toUserIdOrUsername: string, message: string) {
  let client: any = whopSdk.withUser(AGENT);
  if (BIZ && typeof client.withCompany === "function") {
    client = client.withCompany(BIZ);
  }
  return client.messages.sendDirectMessageToUser({
    toUserIdOrUsername,
    message,
  });
}


