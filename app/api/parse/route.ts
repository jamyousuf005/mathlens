import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeMathExpression } from '@/lib/engine/normalizer';
import { tokenize } from '@/lib/engine/lexer';
import { Parser } from '@/lib/engine/parser';
import { MathParseError } from '@/lib/engine/errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';
import { ApiError, badRequest, tooManyRequests } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/handler';

const ParseRequestSchema = z.object({
  expression: z.string().min(1, 'Expression is required').max(300, 'Expression is too long'),
});

export const POST = withApiRoute('/api/parse', async (request) => {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`parse:${ip}`, 60, 60_000);
  if (!rate.success) {
    throw tooManyRequests('Too many parse requests. Please wait a moment.', rate.reset);
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = ParseRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message || 'Invalid input');
  }

  try {
    const normalized = normalizeMathExpression(parsed.data.expression);
    const tokens = tokenize(normalized);
    const ast = new Parser(tokens).parse();

    const { solveMathProblem } = await import('@/lib/engine/solver');
    const dryRun = solveMathProblem(normalized);

    return NextResponse.json({
      ok: true,
      normalizedExpression: normalized,
      astType: ast.type,
      tokensCount: tokens.length - 1,
      problemType: dryRun.problemType,
      isSolvable: dryRun.success,
      latexExpression: dryRun.latexExpression,
      variable: (dryRun as { variable?: string }).variable || 'x',
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof MathParseError) {
      throw new ApiError('PARSE_ERROR', error.message, 400, {
        details: { position: error.position },
      });
    }

    throw error;
  }
});
