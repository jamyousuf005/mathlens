import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { NextRequest, NextResponse } from 'next/server';

const handlers = toNextJsHandler(auth.handler);

export async function GET(request: NextRequest) {
  try {
    return await handlers.GET(request);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[AUTH_GET_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message, stack: error?.stack },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handlers.POST(request);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[AUTH_POST_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message, stack: error?.stack },
      { status: 500 }
    );
  }
}
