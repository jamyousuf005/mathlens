import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { solveMathProblem } from '@/lib/engine/solver';
import { checkRateLimit } from '@/lib/rate-limit';

import { getClientIp } from '@/lib/client-ip';

const SolveRequestSchema = z.object({
  expression: z.string().min(1, 'Expression is required').max(300, 'Expression is too long'),
  angleMode: z.enum(['radians', 'degrees']).optional().default('radians'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`solve:${ip}`, 60, 60_000);
    if (!rate.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many solve requests. Please wait a moment.' } },
        { status: 429, headers: { 'Retry-After': String(rate.reset) } }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = SolveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_REQUEST', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const result = solveMathProblem(parsed.data.expression);

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'SOLVE_ERROR',
            message: result.error || 'Failed to solve expression',
          },
        },
        { status: 422 }
      );
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
      steps: result.steps.map((s) => ({
        rule: s.rule,
        description: s.description,
        math: s.mathExpression,
      })),
      latex: result.latexExpression,
      executionTimeMs: result.executionTimeMs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal solve error';
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
