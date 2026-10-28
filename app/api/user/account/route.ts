import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { mongoDb, mongoClient } from '@/lib/db/client';
import { unauthorized } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/handler';

export const DELETE = withApiRoute('/api/user/account', async (request, { log }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw unauthorized();
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  const performDeletions = async (sessionOption?: {
    session: import('mongodb').ClientSession;
  }) => {
    await mongoDb.collection('problems').deleteMany({ userId }, sessionOption);
    await mongoDb.collection('session').deleteMany({ userId }, sessionOption);
    await mongoDb.collection('account').deleteMany({ userId }, sessionOption);

    if (userEmail) {
      await mongoDb.collection('verification').deleteMany({ identifier: userEmail }, sessionOption);
    }

    await mongoDb.collection('ocr_feedback').deleteMany({ userId }, sessionOption);

    if (ObjectId.isValid(userId)) {
      await mongoDb.collection('user').deleteOne({ _id: new ObjectId(userId) }, sessionOption);
    }
    await mongoDb.collection('user').deleteOne({ id: userId }, sessionOption);
  };

  // Attempt transactional deletion if supported (replica set / Mongo Atlas).
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
  } catch (error) {
    // Standalone MongoDB instances without replica set don't support transactions.
    transactionCompleted = false;
    log.debug('account.transaction_unavailable', { error });
  }

  if (!transactionCompleted) {
    await performDeletions();
  }

  return NextResponse.json({
    ok: true,
    message: 'Account and all associated cloud data permanently deleted.',
  });
});
