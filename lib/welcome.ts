// lib/welcome.ts
// Welcome message and onboarding flow helpers

import { sendDirectMessage } from '@/lib/messaging';
import { getFullOnboardingUrl } from '@/lib/urls';
import { log } from '@/lib/log';

export interface WelcomeMember {
  userId?: string;
  username?: string;
  id?: string;
  communityId?: string;
  source?: string;
}

export interface WelcomeResult {
  delivered: 'dm' | 'fallback';
  id?: string;
  url?: string;
  reason?: string;
  timestamp: string;
}

export async function welcomeNewMember(member: WelcomeMember): Promise<WelcomeResult> {
  const startTime = Date.now();
  
  log.info('welcome.welcomeNewMember', {
    memberId: member.id,
    username: member.username,
    userId: member.userId,
    communityId: member.communityId,
    source: member.source
  });

  // Generate onboarding URL
  const link = getFullOnboardingUrl({ 
    memberId: member.id, 
    username: member.username 
  });
  
  const message = `Welcome! Start here: ${link}`;
  
  log.info('welcome.welcomeNewMember', {
    message: 'Sending welcome message',
    onboardingUrl: link,
    messageLength: message.length
  });

  try {
    const result = await sendDirectMessage({
      toUserId: member.userId,
      toUsername: member.username,
      message,
    });

    const duration = Date.now() - startTime;
    
    if (result.ok) {
      log.info('welcome.welcomeNewMember', {
        message: 'Welcome DM sent successfully',
        messageId: result.id,
        provider: result.provider,
        duration: `${duration}ms`
      });
      
      return {
        delivered: 'dm',
        id: result.id,
        timestamp: new Date().toISOString()
      };
    } else {
      log.info('welcome.welcomeNewMember', {
        message: 'Welcome DM failed, using fallback',
        reason: result.reason,
        skipped: result.skipped,
        duration: `${duration}ms`
      });
      
      return {
        delivered: 'fallback',
        url: link,
        reason: result.reason,
        timestamp: new Date().toISOString()
      };
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    log.error('welcome.welcomeNewMember', {
      message: 'Error during welcome message send',
      error: error?.message || 'Unknown error',
      duration: `${duration}ms`
    });
    
    return {
      delivered: 'fallback',
      url: link,
      reason: 'error',
      timestamp: new Date().toISOString()
    };
  }
}

// Helper for batch welcome messages
export async function welcomeMultipleMembers(members: WelcomeMember[]): Promise<WelcomeResult[]> {
  log.info('welcome.welcomeMultipleMembers', {
    message: 'Starting batch welcome',
    memberCount: members.length
  });
  
  const results = await Promise.all(
    members.map(member => welcomeNewMember(member))
  );
  
  const summary = {
    total: results.length,
    dmDelivered: results.filter(r => r.delivered === 'dm').length,
    fallbackUsed: results.filter(r => r.delivered === 'fallback').length
  };
  
  log.info('welcome.welcomeMultipleMembers', {
    message: 'Batch welcome completed',
    summary
  });
  
  return results;
}
