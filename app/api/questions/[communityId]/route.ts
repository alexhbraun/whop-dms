import { NextResponse } from 'next/server';
import { fetchQuestions, saveQuestions, UIQuestion } from '@/lib/onboardingRepo';

export async function GET(_req: Request, { params }: { params: { communityId: string } }) {
  try {
    const list = await fetchQuestions(params.communityId);
    return NextResponse.json({ ok: true, items: list });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'Failed to load' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { communityId: string } }) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? (body.items as UIQuestion[]) : [];
    if (!items.length) return NextResponse.json({ ok: false, error: 'No questions provided' }, { status: 400 });

    await saveQuestions(params.communityId, items);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'Save failed' }, { status: 500 });
  }
}
