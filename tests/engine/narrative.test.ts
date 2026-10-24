import { describe, it, expect } from 'vitest';
import { solveMathProblem } from '../../lib/engine/solver';
import { generateCompleteNarrative } from '../../lib/engine/narrative';

describe('Complete Solution Narrative Generator', () => {
  it('generates a full written text solution for a quadratic equation', () => {
    const solution = solveMathProblem('x^2 - 5x + 6 = 0');
    expect(solution.success).toBe(true);

    const narrative = generateCompleteNarrative(solution, 'x^2 - 5x + 6 = 0');
    expect(narrative.problemType).toBe('Quadratic Equation');
    expect(narrative.fullPlainText).toContain('x^2 - 5x + 6 = 0');
    expect(narrative.fullPlainText).toContain('x_1 = 2');
    expect(narrative.fullPlainText).toContain('x_2 = 3');
    expect(narrative.fullPlainText).not.toContain('Step 1');
    expect(narrative.fullPlainText).not.toContain('Problem:');
    expect(narrative.sections.length).toBeGreaterThanOrEqual(2);
  });

  it('generates a pure math solution for a linear equation', () => {
    const solution = solveMathProblem('2x + 10 = 0');
    expect(solution.success).toBe(true);

    const narrative = generateCompleteNarrative(solution, '2x + 10 = 0');
    expect(narrative.problemType).toBe('Linear Equation');
    expect(narrative.fullPlainText).toContain('2x + 10 = 0');
    expect(narrative.fullPlainText).toContain('2x = -10');
    expect(narrative.fullPlainText).toContain('x = -5');
    // Ensure zero English words in the pure math output
    expect(narrative.fullPlainText).not.toMatch(/[a-wyzA-WYZ]{3,}/); // No English words with 3+ non-math letters
  });

  it('generates a pure math solution for arithmetic', () => {
    const solution = solveMathProblem('3 * (4 + 6) / 2');
    expect(solution.success).toBe(true);

    const narrative = generateCompleteNarrative(solution, '3 * (4 + 6) / 2');
    expect(narrative.problemType).toBe('Arithmetic');
    expect(narrative.fullPlainText).toContain('15');
  });

  it('handles unsupported or error expressions gracefully', () => {
    const solution = solveMathProblem('1 / 0');
    expect(solution.success).toBe(false);

    const narrative = generateCompleteNarrative(solution, '1 / 0');
    expect(narrative.finalAnswer).toBe('No solution found');
    expect(narrative.fullPlainText).toContain('Division by zero');
  });
});
