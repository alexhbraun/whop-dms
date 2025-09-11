// lib/sendDM.ts
// Simple DM sending function for replay webhook

import { sendDirectDM } from './whopMessaging';

export async function sendDM(params: {
  toUser: string;
  message: string;
  communityId: string;
}) {
  try {
    const result = await sendDirectDM({
      toUserIdOrUsername: params.toUser,
      message: params.message
    });
    
    return {
      ok: result.ok,
      error: result.ok ? null : (result.data || 'Unknown error')
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || String(error)
    };
  }
}
