import { describe, it, expect } from 'vitest';
import { solveMathProblem } from '../../lib/engine/solver';
import tier1Data from '../golden/tier1.json';

describe('Tier 1 200-Problem Golden Test Suite (Section 11, AC-01)', () => {
  it('passes 100% of the 200 Tier 1 golden problem set', () => {
    let passed = 0;
    const failures: { id: number; expr: string; expected: string; actual: string; error?: string }[] = [];

    for (const item of tier1Data) {
      const result = solveMathProblem(item.expr);
      if (result.success && (result.finalAnswerPlain === item.expected || result.exactAnswer === item.expected)) {
        passed++;
      } else {
        failures.push({
          id: item.id,
          expr: item.expr,
          expected: item.expected,
          actual: result.finalAnswerPlain,
          error: result.error,
        });
      }
    }

    if (failures.length > 0) {
      console.error('Golden failures sample:', failures.slice(0, 5));
    }

    expect(passed).toBe(200);
    expect(failures.length).toBe(0);
  });
});
