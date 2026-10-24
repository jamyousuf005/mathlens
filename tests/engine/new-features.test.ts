import { describe, it, expect } from 'vitest';
import { solveMathProblem } from '../../lib/engine/solver';
import { normalizeMathExpression } from '../../lib/engine/normalizer';
import { tokenize } from '../../lib/engine/lexer';
import { Parser } from '../../lib/engine/parser';
import { preprocessCanvasPixels, computeOtsuThreshold, estimateSkewAngle } from '../../lib/recognition/preprocessor';
import { checkRateLimit } from '../../lib/rate-limit';

describe('1. New Mathematical Operations & Tier 1 Completeness', () => {
  it('correctly evaluates square roots and combined arithmetic', () => {
    expect(solveMathProblem('sqrt(4)').finalAnswerPlain).toBe('2');
    expect(solveMathProblem('sqrt(25)').finalAnswerPlain).toBe('5');
    expect(solveMathProblem('sqrt(100) + 5').finalAnswerPlain).toBe('15');
    expect(solveMathProblem('3*sqrt(16)').finalAnswerPlain).toBe('12');
  });

  it('correctly handles factorials up to edge cases', () => {
    expect(solveMathProblem('0!').finalAnswerPlain).toBe('1');
    expect(solveMathProblem('1!').finalAnswerPlain).toBe('1');
    expect(solveMathProblem('3!').finalAnswerPlain).toBe('6');
    expect(solveMathProblem('5!').finalAnswerPlain).toBe('120');
    expect(solveMathProblem('6!').finalAnswerPlain).toBe('720');
  });

  it('correctly evaluates percentages and fractions', () => {
    expect(solveMathProblem('25%').finalAnswerPlain).toBe('1/4');
    expect(solveMathProblem('50%').finalAnswerPlain).toBe('1/2');
    expect(solveMathProblem('100%').finalAnswerPlain).toBe('1');
    expect(solveMathProblem('200 * 15%').finalAnswerPlain).toBe('30');
  });

  it('correctly calculates absolute values with pipe and functional syntax', () => {
    expect(solveMathProblem('abs(-15)').finalAnswerPlain).toBe('15');
    expect(solveMathProblem('abs(15)').finalAnswerPlain).toBe('15');
    expect(solveMathProblem('|−42|').finalAnswerPlain).toBe('42');
    expect(solveMathProblem('|10 - 25|').finalAnswerPlain).toBe('15');
  });

  it('provides both exact and decimal answers when they differ', () => {
    const res = solveMathProblem('1/3 + 1/6');
    expect(res.success).toBe(true);
    expect(res.finalAnswerPlain).toBe('1/2');
    expect(res.exactAnswer).toBe('1/2');
    expect(res.decimalAnswer).toBe(0.5);

    const divRes = solveMathProblem('5/4');
    expect(divRes.exactAnswer).toBe('5/4');
    expect(divRes.decimalAnswer).toBe(1.25);
  });
});

describe('2. Systems of Linear Equations (Cramer’s Rule)', () => {
  it('solves standard 2-variable linear systems', () => {
    const res = solveMathProblem('x + y = 10, x - y = 2');
    expect(res.success).toBe(true);
    expect(res.problemType).toBe('System of Linear Equations');
    expect(res.finalAnswerPlain).toBe('x = 6, y = 4');
    expect(res.isVerified).toBe(true);
  });

  it('solves systems with fractional coefficients', () => {
    const res = solveMathProblem('3x + 2y = 12; x + 4y = 14');
    expect(res.success).toBe(true);
    expect(res.finalAnswerPlain).toBe('x = 2, y = 3');
    expect(res.isVerified).toBe(true);
  });

  it('identifies inconsistent / parallel systems (no solution)', () => {
    const res = solveMathProblem('x + y = 5, x + y = 10');
    expect(res.finalAnswerPlain).toMatch(/no solution/i);
  });

  it('identifies dependent systems (infinitely many solutions)', () => {
    const res = solveMathProblem('2x + 2y = 10, x + y = 5');
    expect(res.finalAnswerPlain).toMatch(/infinitely many solutions/i);
  });
});

describe('3. Rate Limiter Security Utility', () => {
  it('allows requests within limit and throttles excess requests', () => {
    const testKey = 'test-client-' + Date.now();
    for (let i = 0; i < 5; i++) {
      const check = checkRateLimit(testKey, 5, 10_000);
      expect(check.success).toBe(true);
    }
    const blocked = checkRateLimit(testKey, 5, 10_000);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.reset).toBeGreaterThan(0);
  });
});

describe('4. Image Preprocessing Core Logic', () => {
  it('correctly computes Otsu threshold on contrast-separated pixel arrays', () => {
    const gray = new Uint8Array(100);
    for (let i = 0; i < 50; i++) gray[i] = 30; // dark pixels
    for (let i = 50; i < 100; i++) gray[i] = 220; // light background
    const threshold = computeOtsuThreshold(gray);
    expect(threshold).toBeGreaterThanOrEqual(30);
    expect(threshold).toBeLessThanOrEqual(220);
  });

  it('estimates skew angles within bounds', () => {
    const width = 100;
    const height = 100;
    const gray = new Uint8Array(width * height).fill(255);
    const angle = estimateSkewAngle(gray, width, height);
    expect(Math.abs(angle)).toBeLessThanOrEqual(15);
  });
});
