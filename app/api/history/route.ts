import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mongoDb } from '@/lib/db/client';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const StepSchema = z.object({
  rule: z.string().max(200).optional().default('Math Rule'),
  description: z.string().max(2000).optional().default(''),
  mathExpression: z.string().max(2000).optional().default(''),
  before: z.string().max(2000).optional().default(''),
  after: z.string().max(2000).optional().default(''),
});

const HistoryPostSchema = z.object({
  inputType: z.enum(['upload', 'camera', 'pad', 'typed']).default('typed'),
  recognizedText: z.string().max(2000).optional().default(''),
  finalExpression: z.string().min(1, 'Final expression is required').max(2000),
  latex: z.string().max(3000).optional().default(''),
  problemType: z.string().max(100).optional().default('Expression'),
  finalAnswerPlain: z.string().max(2000).optional().default(''),
  finalAnswerLatex: z.string().max(3000).optional().default(''),
  isVerified: z.boolean().optional().default(false),
  answer: z
    .object({
      exact: z.array(z.string()).optional(),
      verified: z.boolean().optional(),
    })
    .optional(),
  steps: z.array(StepSchema).max(100).optional().default([]),
  favorite: z.boolean().optional().default(false),
  corrected: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('q') || '').trim();
    const inputType = searchParams.get('type') || '';
    
    // Safely parse and clamp limit between 1 and 100
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isNaN(rawLimit) || rawLimit <= 0 ? 50 : Math.min(rawLimit, 100);

    const query: Record<string, unknown> = { userId: session.user.id };
    if (inputType) query.inputType = inputType;
    if (search) {
      // Escape special regex characters to prevent regex injection / catastrophic backtracking
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { finalExpression: { $regex: escaped, $options: 'i' } },
        { problemType: { $regex: escaped, $options: 'i' } },
      ];
    }

    const collection = mongoDb.collection('problems');
    const items = await collection.find(query).sort({ createdAt: -1 }).limit(limit).toArray();

    return NextResponse.json({ ok: true, items });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parseResult = HistoryPostSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid problem data', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const collection = mongoDb.collection('problems');
    const newProblem = {
      userId: session.user.id,
      inputType: data.inputType,
      recognizedText: data.recognizedText,
      finalExpression: data.finalExpression,
      latex: data.latex,
      problemType: data.problemType,
      finalAnswerPlain: data.finalAnswerPlain,
      finalAnswerLatex: data.finalAnswerLatex,
      isVerified: data.isVerified,
      answer: data.answer || {
        exact: [data.finalAnswerPlain],
        verified: data.isVerified,
      },
      steps: data.steps,
      favorite: data.favorite,
      corrected: data.corrected,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newProblem);
    return NextResponse.json({ ok: true, id: result.insertedId, item: newProblem });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const collection = mongoDb.collection('problems');
    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json({ ok: false, error: 'Invalid ID format' }, { status: 400 });
      }
      await collection.deleteOne({ _id: new ObjectId(id), userId: session.user.id });
      return NextResponse.json({ ok: true, deleted: id });
    }

    // Delete all problems for this user
    const res = await collection.deleteMany({ userId: session.user.id });
    return NextResponse.json({ ok: true, deletedCount: res.deletedCount });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}
