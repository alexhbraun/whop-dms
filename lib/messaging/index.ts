// lib/messaging/index.ts
// Main messaging service entry point

import { DM_ENABLED, DM_MODE } from '@/lib/flags';
import type { SendOpts, SendResult } from './types';
import { sendViaWhopGraph, isWhopGraphAvailable } from './providers/whopGraph';
import { log } from '@/lib/log';

export async function sendDirectMessage(opts: SendOpts): Promise<SendResult> {
  const startTime = Date.now();
  
  log.info('messaging.sendDirectMessage', {
    enabled: DM_ENABLED,
    mode: DM_MODE,
    recipient: opts.toUserId || opts.toUsername,
    messageLength: opts.message.length
  });

  // Check if DMs are enabled
  if (!DM_ENABLED || DM_MODE === 'none') {
    log.info('messaging.sendDirectMessage', 'DMs disabled, skipping');
    return {
      ok: false,
      skipped: true,
      reason: 'disabled',
      provider: 'none',
      timestamp: new Date().toISOString()
    };
  }

  // Route to appropriate provider based on mode
  if (DM_MODE === 'graph') {
    if (!isWhopGraphAvailable()) {
      log.warn('messaging.sendDirectMessage', 'Whop GraphQL provider not available');
      return {
        ok: false,
        skipped: true,
        reason: 'provider-unavailable',
        provider: 'whop-graphql',
        timestamp: new Date().toISOString()
      };
    }
    
    return await sendViaWhopGraph(opts);
  }

  // Unknown mode
  log.warn('messaging.sendDirectMessage', `Unknown DM mode: ${DM_MODE}`);
  return {
    ok: false,
    skipped: true,
    reason: 'no-adapter',
    provider: 'unknown',
    timestamp: new Date().toISOString()
  };
}

// Helper function for welcome messages
export async function sendWelcomeMessage(member: { 
  userId?: string; 
  username?: string; 
  id?: string;
  communityId?: string;
}): Promise<SendResult> {
  const welcomeText = `Welcome! We're excited to have you join our community. Let's get you set up with everything you need to succeed.`;
  
  return await sendDirectMessage({
    toUserId: member.userId,
    toUsername: member.username,
    message: welcomeText
  });
}

// Export types for consumers
export type { SendOpts, SendResult, MessageContext } from './types';


