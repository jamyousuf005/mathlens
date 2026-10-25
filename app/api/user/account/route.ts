import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mongoDb, mongoClient } from '@/lib/db/client';
import { ObjectId } from 'mongodb';

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Helper to perform the cascaded deletions across collections
    const performDeletions = async (sessionOption?: { session: import('mongodb').ClientSession }) => {
      // 1. Delete all user math problems and history
      await mongoDb.collection('problems').deleteMany({ userId }, sessionOption);

      // 2. Delete all user sessions
      await mongoDb.collection('session').deleteMany({ userId }, sessionOption);

      // 3. Delete Better Auth linked accounts
      await mongoDb.collection('account').deleteMany({ userId }, sessionOption);

      // 4. Delete user verifications (by identifier/email)
      if (userEmail) {
        await mongoDb.collection('verification').deleteMany({ identifier: userEmail }, sessionOption);
      }

      // 5. Delete OCR feedbacks submitted by this user
      await mongoDb.collection('ocr_feedback').deleteMany({ userId }, sessionOption);

      // 6. Delete user profile (try both ObjectId and string ID)
      if (ObjectId.isValid(userId)) {
        await mongoDb.collection('user').deleteOne({ _id: new ObjectId(userId) }, sessionOption);
      }
      await mongoDb.collection('user').deleteOne({ id: userId }, sessionOption);
    };

    // Attempt transactional deletion if supported (replica set / Mongo Atlas)
    let transactionCompleted = false;
    try {
      const dbSession = mongoClient.startSession();
      try {
        await dbSession.withTransaction(async () => {
          await performDeletions({ session: dbSession });
        });
        transactionCompleted = true;
      } finally {
        await dbSession.endSession();
      }
    } catch {
      // Standalone MongoDB instances without replica set don't support transactions
      transactionCompleted = false;
    }

    if (!transactionCompleted) {
      await performDeletions();
    }

    return NextResponse.json({
      ok: true,
      message: 'Account and all associated cloud data permanently deleted.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Account deletion failed' },
      { status: 500 }
    );
  }
}
