import { describe, expect, it } from 'vitest';
import { solveMathProblem } from '../../lib/engine/solver';

function solve(input: string) {
  return solveMathProblem(input);
}

describe('arithmetic', () => {
  it('evaluates powers instead of stripping the caret', () => {
    const result = solve('2^3');
    expect(result.success).toBe(true);
    expect(result.finalAnswerPlain).toBe('8');
  });

  it('respects unary minus and right-associative powers', () => {
    expect(solve('-2^2').finalAnswerPlain).toBe('-4');
    expect(solve('2^3^2').finalAnswerPlain).toBe('512');
  });

  it('supports negative exponents exactly', () => {
    const result = solve('2^-1');
    expect(result.success).toBe(true);
    expect(result.finalAnswerPlain).toBe('1/2');
  });

  it('evaluates grouped expressions', () => {
    expect(solve('(2+3)^2').finalAnswerPlain).toBe('25');
    expect(solve('2(3+4)').finalAnswerPlain).toBe('14');
  });

  it('keeps exact fractions', () => {
    expect(solve('2/4').finalAnswerPlain).toBe('1/2');
    expect(solve('0.1+0.2').finalAnswerPlain).toBe('3/10');
    expect(solve('1/3+1/6').finalAnswerPlain).toBe('1/2');
  });

  it('reports division by zero instead of returning zero', () => {
    const result = solve('5/0');
    expect(result.success).toBe(false);
    expect(result.isVerified).toBe(false);
    expect(result.error).toMatch(/division by zero/i);
  });
});

describe('validation', () => {
  it.each(['2++3', '2+3)', '(2+3', '1.2.3', '2*'])(
    'rejects malformed syntax %s',
    (input) => {
      const result = solve(input);
      expect(result.success).toBe(false);
      expect(result.isVerified).toBe(false);
      expect(result.error).toBeTruthy();
    }
  );

  it('correctly evaluates previously missing Tier 1 operations: factorial, abs, percent, and sqrt', () => {
    expect(solve('5!').finalAnswerPlain).toBe('120');
    expect(solve('|−3|').finalAnswerPlain).toBe('3');
    expect(solve('50%').finalAnswerPlain).toBe('1/2');
    expect(solve('sqrt(9)').finalAnswerPlain).toBe('3');
  });
});

describe('equations', () => {
  it('solves 2-variable linear systems and rejects 3-variable systems without throwing uncaught errors', () => {
    const system = solve('2x+y=5, x-y=1');
    expect(system.success).toBe(true);
    expect(system.problemType).toBe('System of Linear Equations');
    expect(system.finalAnswerPlain).toBe('x = 2, y = 1');
    expect(system.isVerified).toBe(true);

    const threeVar = solve('x+y+z=6, 2x-y=3');
    expect(threeVar.success).toBe(false);
  });

  it('rejects multivariate single equations instead of dropping variables', () => {
    for (const input of ['2x+y=3', 'x^2+y=0']) {
      const result = solve(input);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/multiple variables/i);
    }
  });

  it('expands grouped linear terms before solving', () => {
    expect(solve('2(x+1)=4').finalAnswerPlain).toBe('x = 1');
    expect(solve('3(x-1)=9').finalAnswerPlain).toBe('x = 4');
    expect(solve('x/2+1=3').finalAnswerPlain).toBe('x = 4');
  });

  it('still solves plain linear equations with clean step math', () => {
    expect(solve('3x+5=20').finalAnswerPlain).toBe('x = 5');

    const result = solve('3x-30=0');
    expect(result.finalAnswerPlain).toBe('x = 10');
    // Ensure no double negation like "--30" appears anywhere in the steps
    for (const step of result.steps) {
      expect(step.mathExpression).not.toContain('--');
    }
    expect(result.steps.some((s) => s.mathExpression.includes('3x = 30'))).toBe(true);
  });

  it('still solves quadratics and verifies real roots', () => {
    const result = solve('x^2-5x+6=0');
    expect(result.success).toBe(true);
    expect(result.roots?.slice().sort((a, b) => a - b)).toEqual([2, 3]);
    expect(result.isVerified).toBe(true);
  });

  it('keeps complex roots', () => {
    const result = solve('x^2+1=0');
    expect(result.success).toBe(true);
    expect(result.finalAnswerPlain).toMatch(/i/);
  });

  it('handles no-solution and infinite-solution equations', () => {
    const noSolution = solve('0x=1');
    expect(noSolution.success).toBe(false);
    expect(noSolution.error).toMatch(/no solution/i);

    const infinite = solve('0x=0');
    expect(infinite.success).toBe(false);
    expect(infinite.error).toMatch(/infinite/i);
  });
});

describe('simplification and expansion', () => {
  it('combines like terms', () => {
    expect(solve('3x+x').finalAnswerPlain).toBe('4x');
  });

  it('preserves powers above degree two', () => {
    expect(solve('x^3+x^2').finalAnswerPlain).toBe('x^3 + x^2');
  });

  it('expands implicit and grouped products', () => {
    expect(solve('x(x+1)').finalAnswerPlain).toBe('x^2 + x');
    expect(solve('(x+1)(x+2)').finalAnswerPlain).toBe('x^2 + 3x + 2');
  });

  it('does not factor a polynomial unless every term participates', () => {
    expect(solve('x^2+2xy+y^2+1').finalAnswerPlain).toBe('x^2 + 2xy + y^2 + 1');
  });

  it('factors exact identities', () => {
    expect(solve('x^2+2x+1').finalAnswerPlain).toBe('(x + 1)^2');
    expect(solve('x^2-y^2').finalAnswerPlain).toBe('(x - y)(x + y)');
    expect(solve('x^2+2xy+y^2').finalAnswerPlain).toBe('(x + y)^2');
  });

  it('factors scaled perfect squares and differences of squares', () => {
    expect(solve('4x^2+12x+9').finalAnswerPlain).toBe('(2x + 3)^2');
    expect(solve('9x^2-12x+4').finalAnswerPlain).toBe('(3x - 2)^2');
    expect(solve('x^2-4').finalAnswerPlain).toBe('(x - 2)(x + 2)');
  });

  it('leaves irreducible polynomials alone', () => {
    expect(solve('x^2+1').finalAnswerPlain).toBe('x^2 + 1');
    expect(solve('x^2+y^2').finalAnswerPlain).toBe('x^2 + y^2');
  });
});

describe('edge cases', () => {
  it('keeps OCR x2 shorthand but does not rewrite a letter after another letter', () => {
    expect(solve('x2+3').finalAnswerPlain).toBe('x^2 + 3');
    expect(solve('ab2+3').success).toBe(false);
  });

  it('handles zero and negative exponents', () => {
    expect(solve('2^0').finalAnswerPlain).toBe('1');
    expect(solve('2^-2').finalAnswerPlain).toBe('1/4');
    expect(solve('(-2)^3').finalAnswerPlain).toBe('-8');
  });

  it('reports higher-degree equations as unsupported instead of truncating', () => {
    const result = solve('x^3+x^2=0');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/linear and quadratic/i);
  });

  it('rejects irrational powers and unsupported functions clearly', () => {
    expect(solve('2^0.5').success).toBe(false);
    expect(solve('2^0.5').error).toMatch(/integer exponents/i);
    expect(solve('det(1)').success).toBe(false);
    expect(solve('det(1)').error).toMatch(/unsupported/i);
  });

  it('reports identity and contradictory equations', () => {
    expect(solve('x=x').error).toMatch(/infinite/i);
    expect(solve('2=3').error).toMatch(/no solution/i);
    expect(solve('0=0').error).toMatch(/infinite/i);
    expect(solve('2(x+1)=2x+2').error).toMatch(/infinite/i);
    expect(solve('2(x+1)=2x+3').error).toMatch(/no solution/i);
  });

  it('solves linear equations with variables on both sides', () => {
    expect(solve('3(x+1)=2(x+4)').finalAnswerPlain).toBe('x = 5');
    expect(solve('2x=3x').finalAnswerPlain).toBe('x = 0');
  });

  it('solves repeated and complex quadratics with verification', () => {
    const repeated = solve('x^2-2x+1=0');
    expect(repeated.roots).toEqual([1]);
    expect(repeated.isVerified).toBe(true);

    const complex = solve('x^2+2x+2=0');
    expect(complex.success).toBe(true);
    expect(complex.finalAnswerPlain).toMatch(/i/);
    expect(complex.isVerified).toBe(true);
  });
});
