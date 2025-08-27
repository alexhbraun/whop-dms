// lib/whopDm.ts
// Server-only Whop DM helper using GraphQL endpoint

export async function sendWhopDmByUsername(username: string, message: string) {
  console.log('[whopDm] Starting DM send to Whop API:', {
    username,
    messageLength: message.length,
    hasApiKey: !!process.env.WHOP_API_KEY
  });

  // Log the full HTTP request details (without exposing the API key)
  const requestBody = {
    operation: "sendDirectMessageToUser",
    variables: {
      toUserIdOrUsername: username,
      message,
    },
  };
  
  console.log('[whopDm] HTTP request to Whop:', {
    url: "https://api.whop.com/graphql",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": "***masked***"
    },
    body: requestBody
  });

  const res = await fetch("https://api.whop.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": process.env.WHOP_API_KEY!,
    },
    body: JSON.stringify(requestBody),
  });

  console.log('[whopDm] Whop API response received:', {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    headers: Object.fromEntries(res.headers.entries())
  });

  const text = await res.text();
  
  console.log('[whopDm] Whop API response body:', {
    bodyLength: text.length,
    bodyPreview: text.length > 200 ? text.substring(0, 200) + '...' : text,
    isJson: text.trim().startsWith('{') || text.trim().startsWith('[')
  });

  if (!res.ok) {
    console.error('[whopDm] Whop API call failed:', {
      status: res.status,
      statusText: res.statusText,
      body: text,
      username
    });
    throw new Error(`Whop DM failed ${res.status}: ${text}`);
  }

  let parsedResult;
  try {
    parsedResult = JSON.parse(text);
    console.log('[whopDm] Successfully parsed JSON response:', {
      resultKeys: Object.keys(parsedResult || {}),
      hasData: !!parsedResult?.data,
      hasErrors: !!parsedResult?.errors
    });
  } catch (parseError: any) {
    console.error('[whopDm] Failed to parse JSON response:', {
      error: parseError?.message || 'Unknown parse error',
      body: text
    });
    throw new Error(`Failed to parse Whop response: ${parseError?.message || 'Unknown error'}`);
  }

  return parsedResult;
}
