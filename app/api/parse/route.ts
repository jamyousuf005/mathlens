import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeMathExpression } from '@/lib/engine/normalizer';
import { tokenize } from '@/lib/engine/lexer';
import { Parser } from '@/lib/engine/parser';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';

const ParseRequestSchema = z.object({
  expression: z.string().min(1, 'Expression is required').max(300, 'Expression is too long'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`parse:${ip}`, 60, 60_000);
    if (!rate.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many parse requests. Please wait a moment.' } },
        { status: 429, headers: { 'Retry-After': String(rate.reset) } }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = ParseRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_REQUEST', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const normalized = normalizeMathExpression(parsed.data.expression);
    const tokens = tokenize(normalized);
    const ast = new Parser(tokens).parse();

    // Perform semantic classification using the CAS engine
    const { solveMathProblem } = await import('@/lib/engine/solver');
    const dryRun = solveMathProblem(normalized);

    return NextResponse.json({
      ok: true,
      normalizedExpression: normalized,
      astType: ast.type,
      tokensCount: tokens.length - 1, // exclude EOF
      problemType: dryRun.problemType,
      isSolvable: dryRun.success,
      latexExpression: dryRun.latexExpression,
      variable: (dryRun as { variable?: string }).variable || 'x',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Parse error';
    const position = (err as { position?: number }).position;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'PARSE_ERROR',
          message,
          ...(typeof position === 'number' ? { position } : {}),
        },
      },
      { status: 400 }
    );
  }
}
