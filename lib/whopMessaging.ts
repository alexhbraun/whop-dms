// lib/whopMessaging.ts
// Server-only wrappers for Whop messaging

import { getWhopClient } from './whopClient';

export async function sendDirectDM(params: { toUserIdOrUsername: string; message: string; }) {
  const client = getWhopClient();

  try {
    // Call the SDK's sendDirectMessageToUser method
    const res = await client.messages.sendDirectMessageToUser({
      toUserIdOrUsername: params.toUserIdOrUsername,
      message: params.message,
    });

    // Normalize result - if it's a fetch Response, extract status and data
    if (res instanceof Response) {
      let data;
      try {
        data = await res.json();
      } catch {
        data = await res.text();
      }
      
      return { 
        ok: res.ok, 
        status: res.status, 
        data 
      };
    }
    
    // If SDK returns typed JSON directly
    return { ok: true, status: 200, data: res };
    
  } catch (err: any) {
    // If SDK exposes error response/status, surface it. Otherwise, fallback.
    const status = typeof err?.status === 'number' ? err.status : 500;
    const data = err?.response?.data ?? err?.message ?? 'DM send failed';
    return { ok: false, status, data };
  }
}

