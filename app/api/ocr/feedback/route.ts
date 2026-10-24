import { NextRequest, NextResponse } from 'next/server';
import { mongoDb } from '@/lib/db/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.recognizedText || !body.correctedText) {
      return NextResponse.json({ ok: false, error: 'Invalid feedback payload' }, { status: 400 });
    }

    const collection = mongoDb.collection('ocr_feedback');
    await collection.insertOne({
      recognizedText: body.recognizedText,
      correctedText: body.correctedText,
      confidence: body.confidence,
      engine: body.engine || 'unknown',
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
