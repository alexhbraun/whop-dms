// app/api/diagnostics/health/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/authz";
import { log } from "@/lib/log";

export const runtime = 'nodejs';

export async function GET(req: Request) {
  // Require admin authorization
  requireAdmin(req);
  
  log.info('health.GET', { message: 'Health check requested' });
  
  try {
    const env = {
      WHOP_API_KEY: process.env.WHOP_API_KEY ? 'present' : 'missing',
      AGENT: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID ? 'present' : 'missing',
      COMPANY: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ? 'present' : 'missing',
      DM_ENABLED: process.env.DM_ENABLED || 'false',
      DM_MODE: process.env.DM_MODE || 'none',
      NODE_ENV: process.env.NODE_ENV || 'not set',
      VERCEL: process.env.VERCEL ? 'true' : 'false'
    };
    
    const response = {
      ok: true,
      timestamp: new Date().toISOString(),
      env,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
    
    log.info('health.GET', { message: 'Health check completed', env });
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    log.error('health.GET', {
      message: 'Health check failed',
      error: error?.message || 'Unknown error'
    });
    
    return NextResponse.json({ 
      ok: false, 
      error: error?.message ?? 'Health check failed' 
    }, { status: 500 });
  }
}


