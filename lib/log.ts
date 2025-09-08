// lib/log.ts
// Safe logging utility for development and production

import { shouldLogToConsole } from './flags';
import * as Sentry from "@sentry/nextjs";

export const log = {
  info: (tag: string, data: unknown) => { 
    if (shouldLogToConsole()) {
      try { 
        console.log(`[${tag}]`, safe(data)); 
      } catch {} 
    }
  },
  error: (tag: string, data: unknown) => { 
    if (shouldLogToConsole()) {
      try { 
        console.error(`[${tag}]`, safe(data)); 
      } catch {} 
    }
    try { 
      Sentry.captureMessage(tag, { level: "error", extra: safe(data) }); 
    } catch {} 
  },
  warn: (tag: string, data: unknown) => { 
    if (shouldLogToConsole()) {
      try { 
        console.warn(`[${tag}]`, safe(data)); 
      } catch {} 
    }
  },
  debug: (tag: string, data: unknown) => { 
    if (shouldLogToConsole()) {
      try { 
        console.debug(`[${tag}]`, safe(data)); 
      } catch {} 
    }
  }
};

function safe(v: any): any { 
  try { 
    // Deep clone and sanitize the data
    const cloned = JSON.parse(JSON.stringify(v));
    return sanitizeData(cloned);
  } catch { 
    return String(v); 
  } 
}

function sanitizeData(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeData);
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Remove or mask sensitive keys
    if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
      sanitized[key] = '***masked***';
    } else if (key.toLowerCase().includes('password')) {
      sanitized[key] = '••••••••';
    } else {
      sanitized[key] = sanitizeData(value);
    }
  }
  
  return sanitized;
}

// Additional structured logging functions for Sentry integration
export function logInfo(msg: string, meta?: any) { 
  console.log("[info]", msg, meta ?? ""); 
}

export function logWarn(msg: string, meta?: any) { 
  console.warn("[warn]", msg, meta ?? ""); 
}

export function logError(msg: string, meta?: any) {
  console.error("[error]", msg, meta ?? "");
  try { 
    Sentry.captureMessage(msg, { level: "error", extra: meta }); 
  } catch {} 
}


