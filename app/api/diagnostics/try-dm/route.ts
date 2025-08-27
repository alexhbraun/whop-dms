import { NextResponse } from 'next/server';
import { sendWhopDmByUsername } from '@/lib/whopDm';

export const runtime = 'nodejs';

type Body = {
  recipientUsername: string;  // username like "AlexPaintingleads"
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

    if (!body.recipientUsername || typeof body.recipientUsername !== 'string') {
      console.error('[try-dm.POST] Validation failed: recipientUsername is required and must be a string');
      return NextResponse.json(
        { ok: false, error: 'recipientUsername is required' },
        { status: 400 }
      );
    }

    const messageBody = body.message && body.message.trim().length ? body.message : 'Welcome to the community! 🎉 (diagnostics)';
    console.log('[try-dm.POST] Final message to send:', {
      recipientUsername: body.recipientUsername,
      message: messageBody,
      messageLength: messageBody.length
    });

    try {
      console.log('[try-dm.POST] Calling sendWhopDmByUsername...');
      const result = await sendWhopDmByUsername(body.recipientUsername, messageBody);
      
      console.log('[try-dm.POST] Whop API call successful:', {
        recipientUsername: body.recipientUsername,
        resultKeys: Object.keys(result || {}),
        hasResult: !!result
      });
      
      return NextResponse.json({
        ok: true,
        status: 200,
        recipientUsername: body.recipientUsername,
        message: messageBody,
        result,
      });
      
    } catch (dmError: any) {
      // If the upstream Whop API fails, return error details
      const errorMessage = dmError.message || 'Unknown error';
      console.error('[try-dm.POST] DM sending failed:', {
        recipientUsername: body.recipientUsername,
        error: errorMessage,
        errorType: dmError.constructor.name,
        hasStack: !!dmError.stack
      });
      
      return NextResponse.json({
        ok: false,
        status: 401,
        error: errorMessage,
        recipientUsername: body.recipientUsername,
        message: messageBody,
      });
    }
    
  } catch (e: any) {
    console.error('[try-dm.POST] Request handling error:', {
      error: e?.message || 'Unknown error',
      errorType: e?.constructor?.name || 'unknown',
      hasStack: !!e?.stack,
      recipientUsername: e?.recipientUsername || 'unknown'
    });
    
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Failed to handle request' },
      { status: 400 }
    );
  }
}
