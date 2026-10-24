import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mongoDb } from '@/lib/db/client';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';
    const inputType = searchParams.get('type') || '';
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100);

    const query: Record<string, unknown> = { userId: session.user.id };
    if (inputType) query.inputType = inputType;
    if (search) {
      query.$or = [
        { finalExpression: { $regex: search, $options: 'i' } },
        { problemType: { $regex: search, $options: 'i' } },
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
    if (!body || !body.finalExpression) {
      return NextResponse.json({ ok: false, error: 'Invalid problem data' }, { status: 400 });
    }

    const collection = mongoDb.collection('problems');
    const newProblem = {
      userId: session.user.id,
      inputType: body.inputType || 'typed',
      recognizedText: body.recognizedText || '',
      finalExpression: body.finalExpression,
      latex: body.latex || '',
      problemType: body.problemType || 'Expression',
      answer: body.answer || { exact: [body.finalAnswerPlain || ''], verified: true },
      steps: body.steps || [],
      favorite: Boolean(body.favorite),
      corrected: Boolean(body.corrected),
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
