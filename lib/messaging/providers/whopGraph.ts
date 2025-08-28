// lib/messaging/providers/whopGraph.ts
// Whop GraphQL DM provider implementation

import type { SendOpts, SendResult } from '../types';
import { log } from '@/lib/log';
import { postWhopGraph } from '@/lib/whopGraph';

export async function sendViaWhopGraph(opts: SendOpts): Promise<SendResult> {
  const startTime = Date.now();
  
  log.info('whopGraph.send', {
    recipient: opts.toUserId || opts.toUsername,
    messageLength: opts.message.length,
    hasApiKey: !!process.env.WHOP_API_KEY
  });

  // Check if required environment is available
  if (!process.env.WHOP_API_KEY) {
    log.warn('whopGraph.send', 'Missing WHOP_API_KEY environment variable');
    return {
      ok: false,
      skipped: true,
      reason: 'env-missing',
      provider: 'whop-graphql',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const recipient = opts.toUserId || opts.toUsername;
    if (!recipient) {
      return {
        ok: false,
        skipped: true,
        reason: 'no-recipient',
        provider: 'whop-graphql',
        timestamp: new Date().toISOString()
      };
    }

    // Try different mutation candidates
    const candidates = [
      {
        name: "sendDirectMessageToUser",
        query: `
          mutation SendDM($to:String!,$msg:String!){
            sendDirectMessageToUser(toUserIdOrUsername:$to, message:$msg){ id }
          }
        `,
        vars: (to: string) => ({ to, msg: opts.message })
      },
      {
        name: "messagesSendDirectMessageToUser",
        query: `
          mutation SendDM2($to:String!,$msg:String!){
            messagesSendDirectMessageToUser(toUserIdOrUsername:$to, message:$msg){ id }
          }
        `,
        vars: (to: string) => ({ to, msg: opts.message })
      },
      {
        name: "sendDirectMessage(input)",
        query: `
          mutation SendDM3($input: SendDirectMessageInput!){
            sendDirectMessage(input:$input){ id }
          }
        `,
        vars: (to: string) => ({ input: { toUserIdOrUsername: to, message: opts.message } })
      },
      {
        name: "sendMessageToUser",
        query: `
          mutation SendDM4($to:String!,$msg:String!){
            sendMessageToUser(toUserIdOrUsername:$to, message:$msg){ id }
          }
        `,
        vars: (to: string) => ({ to, msg: opts.message })
      },
    ];

    let winner: { name: string; id: string } | undefined;

    for (const candidate of candidates) {
      log.info('whopGraph.send', `Trying mutation: ${candidate.name}`);
      
      const result = await postWhopGraph(candidate.query, candidate.vars(recipient));
      
      if (result.error || !result.ok) {
        log.warn('whopGraph.send', `${candidate.name} failed:`, {
          status: result.status,
          error: result.error || 'HTTP error'
        });
        continue;
      }

      if (!result.json) {
        log.warn('whopGraph.send', `${candidate.name} returned non-JSON response`);
        continue;
      }

      const errors = Array.isArray(result.json.errors) ? result.json.errors : [];
      if (errors.length > 0) {
        log.warn('whopGraph.send', `${candidate.name} GraphQL errors:`, errors);
        continue;
      }

      // Look for message ID in response
      const dataObj = result.json.data ?? {};
      let id: string | undefined;
      
      for (const k of Object.keys(dataObj)) {
        const v = dataObj[k];
        if (v && typeof v === "object" && typeof v.id === "string") { 
          id = v.id; 
          break; 
        }
      }

      if (id) {
        winner = { name: candidate.name, id };
        log.info('whopGraph.send', `SUCCESS with ${candidate.name}:`, { messageId: id });
        break;
      }
    }

    if (winner) {
      const duration = Date.now() - startTime;
      log.info('whopGraph.send', 'Message sent successfully', {
        provider: 'whop-graphql',
        mutation: winner.name,
        messageId: winner.id,
        duration: `${duration}ms`
      });

      return {
        ok: true,
        id: winner.id,
        provider: 'whop-graphql',
        timestamp: new Date().toISOString()
      };
    }

    // All candidates failed
    log.error('whopGraph.send', 'All GraphQL mutations failed');
    return {
      ok: false,
      skipped: false,
      reason: 'all-mutations-failed',
      provider: 'whop-graphql',
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.error('whopGraph.send', 'Unexpected error during send', {
      error: error?.message || 'Unknown error',
      duration: `${duration}ms`
    });

    return {
      ok: false,
      skipped: false,
      reason: 'unexpected-error',
      provider: 'whop-graphql',
      timestamp: new Date().toISOString()
    };
  }
}

export function isWhopGraphAvailable(): boolean {
  return !!process.env.WHOP_API_KEY;
}
