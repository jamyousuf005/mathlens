import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mongoDb } from '@/lib/db/client';
import { ObjectId } from 'mongodb';

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Delete all user problems/history
    await mongoDb.collection('problems').deleteMany({ userId });

    // 2. Delete user session and user profile
    await mongoDb.collection('session').deleteMany({ userId });
    try {
      await mongoDb.collection('user').deleteOne({ _id: new ObjectId(userId) });
    } catch {
      await mongoDb.collection('user').deleteOne({ id: userId });
    }

    return NextResponse.json({ ok: true, message: 'Account and associated data deleted successfully.' });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Account deletion failed' },
      { status: 500 }
    );
  }
}
