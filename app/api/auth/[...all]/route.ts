import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';
import { withApiRoute } from '@/lib/api/handler';

const handlers = toNextJsHandler(auth.handler);

export const GET = withApiRoute('/api/auth/[...all]', async (request) =>
  handlers.GET(request),
);

export const POST = withApiRoute('/api/auth/[...all]', async (request) =>
  handlers.POST(request),
);
