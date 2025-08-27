import { NextResponse } from 'next/server';
import { sendWhopDmByUsername } from '@/lib/whopDm';

export const runtime = 'nodejs';

type Body = {
  recipientUsername: string;  // username like "AlexPaintingleads"
  message?: string;
};

export async function GET() {
  return NextResponse.json({ ok: true, info: 'GET reachable; POST to attempt a DM' });
}

export async function POST(req: Request) {
  try {
    const { recipientUsername, message }: Body = await req.json();

    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json(
        { ok: false, error: 'Missing WHOP_API_KEY' },
        { status: 500 }
      );
    }

    if (!recipientUsername || typeof recipientUsername !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'recipientUsername is required' },
        { status: 400 }
      );
    }

    const body = message && message.trim().length ? message : 'Welcome to the community! 🎉 (diagnostics)';

    try {
      const result = await sendWhopDmByUsername(recipientUsername, body);
      
      return NextResponse.json({
        ok: true,
        status: 200,
        recipientUsername,
        message: body,
        result,
      });
      
    } catch (dmError: any) {
      // If the upstream Whop API fails, return error details
      const errorMessage = dmError.message || 'Unknown error';
      console.error(`[try-dm] DM failed for ${recipientUsername}:`, errorMessage);
      
      return NextResponse.json({
        ok: false,
        status: 401,
        error: errorMessage,
        recipientUsername,
        message: body,
      });
    }
    
  } catch (e: any) {
    console.error('[try-dm] Request handling error:', e?.message);
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Failed to handle request' },
      { status: 400 }
    );
  }
}
