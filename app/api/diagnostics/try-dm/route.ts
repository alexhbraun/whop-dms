import { NextResponse } from 'next/server';
import { sendDirectDM } from '@/lib/whopMessaging';

export const runtime = 'nodejs';

type Body = {
  recipient: string;     // user id or @username
  message?: string;
};

export async function GET() {
  return NextResponse.json({ ok: true, info: 'GET reachable; POST to attempt a DM' });
}

export async function POST(req: Request) {
  try {
    const { recipient, message }: Body = await req.json();

    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json(
        { ok: false, error: 'Missing WHOP_API_KEY' },
        { status: 500 }
      );
    }

    if (!recipient || typeof recipient !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'recipient is required (user id or @username)' },
        { status: 400 }
      );
    }

    const body = message && message.trim().length ? message : 'Test from Whop DMS diagnostics';

    const result = await sendDirectDM({ toUserIdOrUsername: recipient, message: body });

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      recipient,
      message: body,
      raw: result.data,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Failed to handle request' },
      { status: 400 }
    );
  }
}
