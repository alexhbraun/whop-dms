import { NextResponse } from 'next/server';
import { sendWhopDmByUsername } from '@/lib/whopDm';

export const runtime = 'nodejs';

type Body = {
  recipientUsername?: string;  // username like "AlexPaintingleads"
  recipientUserId?: string;    // user ID like "user_XXXXXX"
  message?: string;
};

export async function GET() {
  console.log('[try-dm.GET] Endpoint reached');
  return NextResponse.json({ ok: true, info: 'GET reachable; POST to attempt a DM' });
}

export async function POST(req: Request) {
  console.log('[try-dm.POST] Request started');
  
  try {
    // Log environment variables (without exposing values)
    console.log('[try-dm.POST] Environment check:', {
      NEXT_PUBLIC_WHOP_COMPANY_ID: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ? 'present' : 'missing',
      NEXT_PUBLIC_WHOP_AGENT_USER_ID: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID ? 'present' : 'missing',
      WHOP_API_KEY: process.env.WHOP_API_KEY ? 'present' : 'missing',
      NODE_ENV: process.env.NODE_ENV || 'not set'
    });

    // Parse and log the inbound request body
    const body: Body = await req.json();
    console.log('[try-dm.POST] Inbound request body:', {
      recipientUsername: body.recipientUsername,
      recipientUserId: body.recipientUserId,
      message: body.message,
      hasMessage: !!body.message,
      messageLength: body.message?.length || 0
    });

    if (!process.env.WHOP_API_KEY) {
      console.error('[try-dm.POST] Missing WHOP_API_KEY environment variable');
      return NextResponse.json(
        { ok: false, error: 'Missing WHOP_API_KEY' },
        { status: 500 }
      );
    }

    // Check that we have either a username or user ID
    if (!body.recipientUsername && !body.recipientUserId) {
      console.error('[try-dm.POST] Validation failed: either recipientUsername or recipientUserId is required');
      return NextResponse.json(
        { ok: false, error: 'Either recipientUsername or recipientUserId is required' },
        { status: 400 }
      );
    }

    // Use recipientUserId if provided, otherwise fall back to recipientUsername
    const recipient = body.recipientUserId || body.recipientUsername!;
    console.log('[try-dm.POST] Using recipient:', {
      recipient,
      type: body.recipientUserId ? 'user_id' : 'username'
    });

    const messageBody = body.message && body.message.trim().length ? body.message : 'Welcome to the community! 🎉 (diagnostics)';
    console.log('[try-dm.POST] Final message to send:', {
      recipient,
      message: messageBody,
      messageLength: messageBody.length
    });

    try {
      console.log('[try-dm.POST] Calling sendWhopDmByUsername...');
      const result = await sendWhopDmByUsername(recipient, messageBody);
      
      console.log('[try-dm.POST] Whop API call completed:', {
        recipient,
        result: result
      });
      
      // Return the result directly from sendWhopDmByUsername
      if (result.ok) {
        return NextResponse.json({
          ok: true,
          recipient,
          result: { id: result.id }
        });
      } else {
        return NextResponse.json({
          ok: false,
          recipient,
          errors: result.errors
        });
      }
      
    } catch (dmError: any) {
      // If the upstream Whop API fails, return error details
      const errorMessage = dmError.message || 'Unknown error';
      console.error('[try-dm.POST] DM sending failed:', {
        recipient,
        error: errorMessage,
        errorType: dmError.constructor.name,
        hasStack: !!dmError.stack
      });
      
      return NextResponse.json({
        ok: false,
        recipient,
        errors: [{ message: errorMessage }]
      });
    }
    
  } catch (e: any) {
    console.error('[try-dm.POST] Request handling error:', {
      error: e?.message || 'Unknown error',
      errorType: e?.constructor?.name || 'unknown',
      hasStack: !!e?.stack,
      recipient: e?.recipient || 'unknown'
    });
    
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Failed to handle request' },
      { status: 400 }
    );
  }
}
