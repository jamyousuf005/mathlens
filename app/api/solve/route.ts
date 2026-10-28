import { NextResponse } from 'next/server';
import { z } from 'zod';
import { solveMathProblem } from '@/lib/engine/solver';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';
import { ApiError, badRequest, tooManyRequests } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/handler';

const SolveRequestSchema = z.object({
  expression: z.string().min(1, 'Expression is required').max(300, 'Expression is too long'),
  angleMode: z.enum(['radians', 'degrees']).optional().default('radians'),
});

export const POST = withApiRoute('/api/solve', async (request) => {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`solve:${ip}`, 60, 60_000);
  if (!rate.success) {
    throw tooManyRequests('Too many solve requests. Please wait a moment.', rate.reset);
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = SolveRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message || 'Invalid input');
  }

  const result = solveMathProblem(parsed.data.expression);

  if (!result.success) {
    throw new ApiError('SOLVE_ERROR', result.error || 'Failed to solve expression', 422);
  }

  return NextResponse.json({
    ok: true,
    problemType: result.problemType,
    normalizedExpression: result.normalizedExpression,
    answer: {
      exact: result.exactAnswer || result.finalAnswerPlain,
      decimal: result.decimalAnswer,
      plain: result.finalAnswerPlain,
      latex: result.finalAnswerLatex,
      verified: result.isVerified,
    },
    roots: result.roots,
    steps: result.steps.map((step) => ({
      rule: step.rule,
      description: step.description,
      math: step.mathExpression,
    })),
    latex: result.latexExpression,
    executionTimeMs: result.executionTimeMs,
  });
});
