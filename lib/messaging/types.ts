// lib/messaging/types.ts
// Core types for the messaging service

export type SendOpts = { 
  toUserId?: string; 
  toUsername?: string; 
  message: string; 
};

export type SendResult = { 
  ok: boolean; 
  skipped?: boolean; 
  reason?: string; 
  id?: string; 
  raw?: unknown; 
  provider?: string;
  timestamp: string;
};

export type MessageProvider = {
  name: string;
  send: (opts: SendOpts) => Promise<SendResult>;
  isAvailable: () => boolean;
};

export type MessageContext = {
  memberId?: string;
  username?: string;
  userId?: string;
  communityId?: string;
  source?: string;
};
