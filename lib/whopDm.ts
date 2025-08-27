// lib/whopDm.ts
// Server-only Whop DM helper using GraphQL endpoint

export async function sendWhopDmByUsername(username: string, message: string) {
  console.log('[whopDm] Starting DM send to Whop API:', {
    username,
    messageLength: message.length,
    hasApiKey: !!process.env.WHOP_API_KEY
  });

  const query = `
    mutation SendDM($toUserIdOrUsername: String!, $message: String!) {
      sendDirectMessageToUser(
        toUserIdOrUsername: $toUserIdOrUsername,
        message: $message
      ) { id }
    }
  `;

  const body = {
    query,
    variables: {
      toUserIdOrUsername: username,   // can be a username (e.g. "AlexPaintingleads") or userId
      message
    }
  };

  // Log the full HTTP request details (without exposing the API key)
  console.log('[whopDm] HTTP request to Whop:', {
    url: "https://api.whop.com/graphql",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": "***masked***"
    },
    body: body
  });

  const resp = await fetch("https://api.whop.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": process.env.WHOP_API_KEY!,
    },
    body: JSON.stringify(body),
  });

  console.log('[whopDm] Whop API response received:', {
    status: resp.status,
    statusText: resp.statusText,
    ok: resp.ok,
    headers: Object.fromEntries(resp.headers.entries()),
    requestId: resp.headers.get('x-request-id') || 'not provided'
  });

  const text = await resp.text();
  console.log("[whopDm] Raw Whop response:", text);
  
  console.log('[whopDm] Whop API response body:', {
    bodyLength: text.length,
    bodyPreview: text.length > 200 ? text.substring(0, 200) + '...' : text,
    isJson: text.trim().startsWith('{') || text.trim().startsWith('[')
  });

  let json: any;
  try {
    json = await resp.json();
    console.log("[whopDm] response", JSON.stringify(json, null, 2));
  } catch (parseError: any) {
    console.error('[whopDm] Failed to parse JSON response:', {
      error: parseError?.message || 'Unknown parse error',
      body: text
    });
    throw new Error("Invalid JSON from Whop: " + text);
  }

  // Check for GraphQL errors first
  if (json.errors && json.errors.length > 0) {
    console.error("[whopDm] Whop returned GraphQL errors:", json.errors);
    return { ok: false, errors: json.errors };
  }

  // Check if we have the expected data structure
  if (json.data?.sendDirectMessageToUser?.id) {
    console.log('[whopDm] Successfully sent DM:', {
      messageId: json.data.sendDirectMessageToUser.id,
      username
    });
    return { ok: true, id: json.data.sendDirectMessageToUser.id };
  }

  // If we get here, something unexpected happened
  console.error('[whopDm] Unexpected response structure:', {
    hasData: !!json.data,
    dataKeys: json.data ? Object.keys(json.data) : [],
    hasSendDirectMessageToUser: !!json.data?.sendDirectMessageToUser,
    response: json
  });
  
  return { ok: false, errors: [{ message: "Unexpected response structure from Whop API" }] };
}
