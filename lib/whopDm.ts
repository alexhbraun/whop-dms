// lib/whopDm.ts
// Server-only Whop DM helper using GraphQL endpoint

export async function sendWhopDmByUsername(username: string, message: string) {
  const res = await fetch("https://api.whop.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": process.env.WHOP_API_KEY!,
    },
    body: JSON.stringify({
      operation: "sendDirectMessageToUser",
      variables: {
        toUserIdOrUsername: username,
        message,
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Whop DM failed:", text);
    throw new Error(`Whop DM failed ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}
