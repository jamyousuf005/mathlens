import { NextResponse } from 'next/server';
import { mongoDb } from '@/lib/db/client';
import { auth } from '@/lib/auth';

export async function GET() {
  const envCheck = {
    hasMongoUri: !!process.env.MONGODB_URI,
    hasAuthSecret: !!(process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET),
    betterAuthUrl: process.env.BETTER_AUTH_URL || '(empty)',
    hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    googleIdLength: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.length : 0,
    googleSecretLength: process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.length : 0,
    nodeEnv: process.env.NODE_ENV,
  };

  let mongoStatus = 'unknown';
  let mongoError = null;

  try {
    const collections = await mongoDb.listCollections().toArray();
    mongoStatus = `connected (found ${collections.length} collections)`;
  } catch (err: unknown) {
    const error = err as Error;
    mongoStatus = 'failed';
    mongoError = error.message;
  }

  let directAuthResult = null;
  let directAuthError = null;

  try {
    const testReq = new Request('https://mathlens-rho.vercel.app/api/auth/sign-in/social', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://mathlens-rho.vercel.app',
      },
      body: JSON.stringify({
        provider: 'google',
        callbackURL: 'https://mathlens-rho.vercel.app/welcome',
      }),
    });

    const res = await auth.handler(testReq);
    const bodyText = await res.text();
    directAuthResult = {
      status: res.status,
      body: bodyText,
    };
  } catch (err: unknown) {
    const error = err as Error;
    directAuthError = {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: envCheck,
    mongoConnection: {
      status: mongoStatus,
      error: mongoError,
    },
    directAuthExecution: {
      result: directAuthResult,
      error: directAuthError,
    },
  });
}
