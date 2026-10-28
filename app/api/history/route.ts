import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { mongoDb } from '@/lib/db/client';
import { badRequest, unauthorized } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/handler';

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

export const GET = withApiRoute('/api/history', async (request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('q') || '').trim();
  const inputType = searchParams.get('type') || '';

  const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
  const limit = Number.isNaN(rawLimit) || rawLimit <= 0 ? 50 : Math.min(rawLimit, 100);

  const query: Record<string, unknown> = { userId: session.user.id };
  if (inputType) query.inputType = inputType;
  if (search) {
    // Escape regex metacharacters to prevent regex injection / catastrophic backtracking.
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { finalExpression: { $regex: escaped, $options: 'i' } },
      { problemType: { $regex: escaped, $options: 'i' } },
    ];
  }

  const collection = mongoDb.collection('problems');
  const items = await collection.find(query).sort({ createdAt: -1 }).limit(limit).toArray();

  return NextResponse.json({ ok: true, items });
});

export const POST = withApiRoute('/api/history', async (request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw unauthorized();
  }

  const body: unknown = await request.json().catch(() => null);
  const parseResult = HistoryPostSchema.safeParse(body);
  if (!parseResult.success) {
    throw badRequest('Invalid problem data', {
      issues: parseResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
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
});

export const DELETE = withApiRoute('/api/history', async (request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const collection = mongoDb.collection('problems');
  if (id) {
    if (!ObjectId.isValid(id)) {
      throw badRequest('Invalid ID format');
    }
    await collection.deleteOne({ _id: new ObjectId(id), userId: session.user.id });
    return NextResponse.json({ ok: true, deleted: id });
  }

  const result = await collection.deleteMany({ userId: session.user.id });
  return NextResponse.json({ ok: true, deletedCount: result.deletedCount });
});
