import type { NextRequest } from 'next/server';
import { ApiError, getErrorStatus, toErrorResponse } from '@/lib/api/errors';
import { logger, type Logger } from '@/lib/observability/logger';

export interface ApiRequestContext {
  requestId: string;
  log: Logger;
}

export type ApiRouteHandler = (
  request: NextRequest,
  context: ApiRequestContext,
) => Promise<Response> | Response;

const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function generateRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `req_${globalThis.crypto.randomUUID()}`;
  }

  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getRequestId(request: NextRequest): string {
  const incoming = request.headers.get(REQUEST_ID_HEADER)?.trim();
  if (incoming && REQUEST_ID_PATTERN.test(incoming)) return incoming;
  return generateRequestId();
}

function attachRequestId(response: Response, requestId: string): Response {
  if (response.headers.get(REQUEST_ID_HEADER) === requestId) return response;

  try {
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  } catch {
    const headers = new Headers(response.headers);
    headers.set(REQUEST_ID_HEADER, requestId);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

export function withApiRoute(route: string, handler: ApiRouteHandler) {
  return async function routeHandler(request: NextRequest): Promise<Response> {
    const requestId = getRequestId(request);
    const startedAt = Date.now();
    const log = logger.child({ route, requestId, method: request.method });

    try {
      const response = attachRequestId(
        await handler(request, { requestId, log }),
        requestId,
      );

      log.info('api.request.completed', {
        status: response.status,
        durationMs: Date.now() - startedAt,
      });

      return response;
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      if (error instanceof Response) {
        const response = attachRequestId(error, requestId);
        const level = response.status >= 500 ? 'error' : 'warn';
        log[level]('api.request.failed', { status: response.status, durationMs });
        return response;
      }

      const status = getErrorStatus(error);
      const code = error instanceof ApiError ? error.code : 'REQUEST_FAILED';

      if (status >= 500) {
        log.error('api.request.failed', { status, code, durationMs, error });
      } else {
        log.warn('api.request.failed', { status, code, durationMs });
      }

      return attachRequestId(toErrorResponse(error, requestId), requestId);
    }
  };
}
