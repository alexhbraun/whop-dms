// app/api/diagnostics/try-dm/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/authz";
import { sendDirectMessage } from "@/lib/messaging";
import { log } from "@/lib/log";

export const runtime = 'nodejs';

type Body = { 
  recipientUsername?: string; 
  recipientUserId?: string; 
  message?: string 
};

export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    info: "POST to test DM functionality" 
  });
}

export async function POST(req: Request) {
  // Require admin authorization
  requireAdmin(req);
  
  log.info('try-dm.POST', { message: 'DM test requested' });
  
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const msg = (body.message ?? "Test message from diagnostics").toString();
    
    log.info('try-dm.POST', {
      message: 'Request body received',
      hasRecipientUsername: !!body.recipientUsername,
      hasRecipientUserId: !!body.recipientUserId,
      hasMessage: !!body.message,
      messageLength: msg.length
    });
    
    const recipient = body.recipientUserId
      ? { type: "userId" as const, value: body.recipientUserId }
      : body.recipientUsername
        ? { type: "username" as const, value: body.recipientUsername.replace(/^@/, "") }
        : null;
        
    if (!recipient) {
      log.warn('try-dm.POST', { message: 'Validation failed: missing recipient' });
      return NextResponse.json({ 
        ok: false, 
        error: "recipientUsername or recipientUserId required" 
      }, { status: 400 });
    }
    
    if (!msg) {
      log.warn('try-dm.POST', { message: 'Validation failed: missing message' });
      return NextResponse.json({ 
        ok: false, 
        error: "message required" 
      }, { status: 400 });
    }

    log.info('try-dm.POST', {
      message: 'Using recipient',
      type: recipient.type,
      value: recipient.value,
      messageLength: msg.length
    });

    // Use the messaging service boundary
    const result = await sendDirectMessage({
      toUserId: recipient.type === 'userId' ? recipient.value : undefined,
      toUsername: recipient.type === 'username' ? recipient.value : undefined,
      message: msg
    });

    log.info('try-dm.POST', {
      message: 'DM result received',
      ok: result.ok,
      skipped: result.skipped,
      reason: result.reason,
      provider: result.provider,
      id: result.id
    });

    const response = {
      ok: result.ok,
      recipient,
      message: msg,
      result: {
        ok: result.ok,
        skipped: result.skipped,
        reason: result.reason,
        provider: result.provider,
        id: result.id,
        timestamp: result.timestamp
      }
    };
    
    return NextResponse.json(response, { status: result.ok ? 200 : 400 });
    
  } catch (error: any) {
    log.error('try-dm.POST', {
      message: 'Error during DM test',
      error: error?.message || 'Unknown error',
      errorType: error?.constructor?.name || 'unknown'
    });
    
    return NextResponse.json({ 
      ok: false, 
      error: error?.message ?? 'Failed to test DM functionality' 
    }, { status: 500 });
  }
}
