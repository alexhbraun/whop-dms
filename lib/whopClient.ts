// lib/whopClient.ts
// Server-only Whop client using WHOP_API_KEY

export function getWhopClient() {
  const apiKey = process.env.WHOP_API_KEY;
  const base = process.env.WHOP_API_BASE || 'https://api.whop.com';
  
  if (!apiKey) {
    throw new Error('Missing WHOP_API_KEY environment variable');
  }
  
  return {
    apiKey,
    baseUrl: base,
    messages: {
      async sendDirectMessageToUser({ toUserIdOrUsername, message }: { 
        toUserIdOrUsername: string; 
        message: string; 
      }) {
        // Whop API endpoint for sending DMs
        // The app's Agent identity is used by default with the app API key
        const response = await fetch(`${base}/v2/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            recipient_user_id: toUserIdOrUsername,
            body: message,
            // No sender_user_id needed - app's Agent is used by default
          }),
        });
        
        return response;
      }
    }
  };
}







