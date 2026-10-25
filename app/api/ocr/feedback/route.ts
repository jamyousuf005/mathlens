import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { mongoDb } from '@/lib/db/client';
import { checkRateLimit } from '@/lib/rate-limit';

const FeedbackSchema = z.object({
  recognizedText: z.string().min(1).max(500),
  correctedText: z.string().min(1).max(500),
  confidence: z.number().min(0).max(100).optional(),
  engine: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce authentication: guest users do not store telemetry on server
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Protect against spam / quota abuse (max 20 feedback submissions per minute per user)
    const rate = checkRateLimit(`ocr_feedback:${session.user.id}`, 20, 60_000);
    if (!rate.success) {
      return NextResponse.json(
        { ok: false, error: 'Too many feedback submissions. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rate.reset) } }
      );
    }

    // 3. Validate request payload with Zod
    const rawBody: unknown = await req.json().catch(() => null);
    const parsed = FeedbackSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid feedback payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { recognizedText, correctedText, confidence, engine } = parsed.data;

    const collection = mongoDb.collection('ocr_feedback');
    await collection.insertOne({
      userId: session.user.id,
      recognizedText,
      correctedText,
      confidence,
      engine: engine || 'unknown',
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Feedback recording error' },
      { status: 500 }
    );
  }
}
