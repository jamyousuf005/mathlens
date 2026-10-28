import type { Instrumentation } from 'next';
import { logger } from '@/lib/observability/logger';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { mongoDb } = await import('@/lib/db/client');
      // Ensure essential indexes on startup
      await mongoDb.collection('problems').createIndex({ userId: 1, createdAt: -1 });
      await mongoDb.collection('problems').createIndex({ finalExpression: 'text' });
    } catch (error) {
      // Don't crash runtime if offline in build/test environments
      logger.warn('mongodb.startup_failed', { error });
    }
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const rawDigest =
    error && typeof error === 'object' && 'digest' in error
      ? (error as { digest?: unknown }).digest
      : undefined;
  const digest = typeof rawDigest === 'string' ? rawDigest : undefined;

  logger.error('next.request_error', {
    digest,
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
    error,
  });
};

