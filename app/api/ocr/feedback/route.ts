import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { mongoDb } from '@/lib/db/client';
import { checkRateLimit } from '@/lib/rate-limit';
import { badRequest, tooManyRequests, unauthorized } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/handler';

const FeedbackSchema = z.object({
  recognizedText: z.string().min(1).max(500),
  correctedText: z.string().min(1).max(500),
  confidence: z.number().min(0).max(100).optional(),
  engine: z.string().max(100).optional(),
});

export const POST = withApiRoute('/api/ocr/feedback', async (request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw unauthorized();
  }

  const rate = checkRateLimit(`ocr_feedback:${session.user.id}`, 20, 60_000);
  if (!rate.success) {
    throw tooManyRequests('Too many feedback submissions. Please slow down.', rate.reset);
  }

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = FeedbackSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw badRequest('Invalid feedback payload', {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
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
});
