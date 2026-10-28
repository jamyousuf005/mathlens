import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PAYLOAD_TOO_LARGE'
  | 'PARSE_ERROR'
  | 'SOLVE_ERROR'
  | 'UPSTREAM_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'REQUEST_CANCELLED'
  | 'INTERNAL_ERROR';

export interface ApiErrorOptions {
  expose?: boolean;
  details?: unknown;
  headers?: Record<string, string>;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly expose: boolean;
  readonly details?: unknown;
  readonly headers?: Record<string, string>;

  constructor(code: ApiErrorCode, message: string, status = 500, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.expose = options.expose ?? status < 500;
    this.details = options.details;
    this.headers = options.headers;

    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

interface NormalizedError {
  code: ApiErrorCode;
  status: number;
  message: string;
}

function mapStatusToCode(status: number): ApiErrorCode {
  if (status === 400 || status === 422) return 'INVALID_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  if (status === 429) return 'RATE_LIMIT_EXCEEDED';
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'BAD_REQUEST';
}

// Better Auth and some libraries throw errors carrying a `status` rather than
// returning a response. Preserve the intended 4xx status without leaking 5xx details.
export function normalizeUnknownError(error: unknown): NormalizedError | null {
  if (!error || typeof error !== 'object') return null;

  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    body?: unknown;
    message?: unknown;
  };

  const rawStatus =
    typeof candidate.status === 'number'
      ? candidate.status
      : typeof candidate.statusCode === 'number'
        ? candidate.statusCode
        : undefined;

  if (rawStatus === undefined || rawStatus < 400 || rawStatus > 599) return null;

  const body =
    candidate.body && typeof candidate.body === 'object'
      ? (candidate.body as { message?: unknown })
      : undefined;

  const message =
    (typeof body?.message === 'string' && body.message) ||
    (typeof candidate.message === 'string' && candidate.message) ||
    'Request failed';

  return {
    code: mapStatusToCode(rawStatus),
    status: rawStatus,
    message,
  };
}

export function getErrorStatus(error: unknown): number {
  if (error instanceof ApiError) return error.status;
  return normalizeUnknownError(error)?.status ?? 500;
}

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

export function toErrorResponse(error: unknown, requestId: string): NextResponse {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  headers.set('x-request-id', requestId);

  if (error instanceof ApiError) {
    for (const [key, value] of Object.entries(error.headers ?? {})) {
      headers.set(key, value);
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.expose ? error.message : GENERIC_MESSAGE,
          requestId,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
      { status: error.status, headers },
    );
  }

  const normalized = normalizeUnknownError(error);
  if (normalized && normalized.status < 500) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: normalized.code,
          message: normalized.message,
          requestId,
        },
      },
      { status: normalized.status, headers },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: GENERIC_MESSAGE,
        requestId,
      },
    },
    { status: 500, headers },
  );
}

export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError('INVALID_REQUEST', message, 400, { details });
}

export function unauthorized(message = 'You must be signed in to do that.'): ApiError {
  return new ApiError('UNAUTHORIZED', message, 401);
}

export function notFound(message = 'Not found.'): ApiError {
  return new ApiError('NOT_FOUND', message, 404);
}

export function tooManyRequests(message: string, retryAfterSeconds: number): ApiError {
  return new ApiError('RATE_LIMIT_EXCEEDED', message, 429, {
    headers: { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterSeconds))) },
  });
}

export function payloadTooLarge(message = 'The request payload is too large.'): ApiError {
  return new ApiError('PAYLOAD_TOO_LARGE', message, 413);
}

export function upstreamError(message = 'The upstream service is unavailable.'): ApiError {
  return new ApiError('UPSTREAM_ERROR', message, 502, { expose: true });
}
