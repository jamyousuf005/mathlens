import { describe, it, expect } from 'vitest';
import { solveMathProblem } from '../../lib/engine/solver';

const solve = (expr: string) => solveMathProblem(expr);

describe('Live Diagnostic on Brand New Test Values', () => {
  it('1. Complex Arithmetic: sqrt, factorials, percentages, and absolute values', () => {
    // sqrt(256) = 16, 4! = 24, 15% * 200 = 30, |-40| = 40
    // 16 + 24 - 30 + 40 = 50
    const res = solve('sqrt(256) + 4! - 15% * 200 + | -40 |');
    console.log('\n[TEST 1 - Complex Arithmetic]');
    console.log('Result:', res.finalAnswerPlain);
    expect(res.success).toBe(true);
    expect(res.finalAnswerPlain).toBe('50');
    expect(res.decimalAnswer).toBe(50);
    expect(res.isVerified).toBe(true);
  });

  it('2. Linear Equation with multiple variable terms: 5x - 14 = 2x + 16', () => {
    // 3x = 30 => x = 10
    const res = solve('5x - 14 = 2x + 16');
    console.log('\n[TEST 2 - Linear Equation]');
    console.log('Result:', res.finalAnswerPlain);
    expect(res.success).toBe(true);
    expect(res.finalAnswerPlain).toBe('x = 10');
    expect(res.decimalAnswer).toBe(10);
    expect(res.isVerified).toBe(true);
  });

  it('3. Linear Equation with distribution: 4(2x - 3) = 3(x + 6)', () => {
    // 8x - 12 = 3x + 18 => 5x = 30 => x = 6
    const res = solve('4(2x - 3) = 3(x + 6)');
    console.log('\n[TEST 3 - Distribution]');
    console.log('Result:', res.finalAnswerPlain);
    expect(res.success).toBe(true);
    expect(res.finalAnswerPlain).toBe('x = 6');
    expect(res.decimalAnswer).toBe(6);
    expect(res.isVerified).toBe(true);
  });

  it('4. Quadratic Equation with distinct real roots: x^2 - 8x + 15 = 0', () => {
    // (x - 3)(x - 5) = 0 => roots = 3, 5
    const res = solve('x^2 - 8x + 15 = 0');
    console.log('\n[TEST 4 - Quadratic Distinct Roots]');
    console.log('Result:', res.finalAnswerPlain);
    console.log('Roots:', res.roots);
    expect(res.success).toBe(true);
    expect(res.finalAnswerPlain).toBe('x = 3, x = 5');
    expect(res.roots).toEqual([3, 5]);
    expect(res.isVerified).toBe(true);
  });

  it('5. Quadratic Equation with repeated single root: x^2 - 12x + 36 = 0', () => {
    // (x - 6)^2 = 0 => x = 6
    const res = solve('x^2 - 12x + 36 = 0');
    console.log('\n[TEST 5 - Quadratic Repeated Root]');
    console.log('Result:', res.finalAnswerPlain);
    expect(res.success).toBe(true);
    expect(res.finalAnswerPlain).toBe('x = 6');
    expect(res.roots).toEqual([6]);
    expect(res.isVerified).toBe(true);
  });

  it('6. Quadratic Equation with complex roots: x^2 + 4x + 13 = 0', () => {
    // Discriminant: 16 - 52 = -36 < 0 => x = -2 ± 3i
    const res = solve('x^2 + 4x + 13 = 0');
    console.log('\n[TEST 6 - Quadratic Complex Roots]');
    console.log('Result:', res.finalAnswerPlain);
    expect(res.success).toBe(true);
    expect(res.finalAnswerPlain).toBe('x = -2.00 +/- 3.00i');
    expect(res.isVerified).toBe(true);
  });

  it('7. System of 2 Linear Equations (Cramer\'s Rule): 3x + 4y = 25, 2x - 3y = -6', () => {
    // D = 3(-3) - 4(2) = -9 - 8 = -17
    // Dx = 25(-3) - 4(-6) = -75 + 24 = -51 => x = 3
    // Dy = 3(-6) - 25(2) = -18 - 50 = -68 => y = 4
    const res = solve('3x + 4y = 25, 2x - 3y = -6');
    console.log('\n[TEST 7 - System of Linear Equations]');
    console.log('Result:', res.finalAnswerPlain);
    expect(res.success).toBe(true);
    expect(res.finalAnswerPlain).toBe('x = 3, y = 4');
    expect(res.decimalAnswer).toEqual([3, 4]);
    expect(res.isVerified).toBe(true);
  });

  it('8. Inconsistent System (Parallel lines / No solution): 2x + 4y = 10, x + 2y = 8', () => {
    // D = 2(2) - 4(1) = 0, Dx = 10(2) - 4(8) = -12 != 0 => Parallel lines
    const res = solve('2x + 4y = 10, x + 2y = 8');
    console.log('\n[TEST 8 - Inconsistent System]');
    console.log('Result:', res.finalAnswerPlain);
    expect(res.success).toBe(true);
    expect(res.finalAnswerPlain).toBe('No solution (parallel lines)');
  });

  it('9. Dependent System (Coincident lines / Infinite solutions): 3x - 6y = 9, x - 2y = 3', () => {
    // D = 0, Dx = 0, Dy = 0 => Coincident lines
    const res = solve('3x - 6y = 9, x - 2y = 3');
    console.log('\n[TEST 9 - Dependent System]');
    console.log('Result:', res.finalAnswerPlain);
    expect(res.success).toBe(true);
    expect(res.finalAnswerPlain).toBe('Infinitely many solutions (dependent system)');
  });

  it('10. Trigonometric & Logarithmic evaluation: sin(0) + cos(0) * 10 + log(100)', () => {
    // sin(0)=0, cos(0)=1 => 1 * 10 = 10, log10(100) = 2 => 0 + 10 + 2 = 12
    const res = solve('sin(0) + cos(0) * 10 + log(100)');
    console.log('\n[TEST 10 - Trig & Log]');
    console.log('Result:', res.finalAnswerPlain);
    expect(res.success).toBe(true);
    expect(res.finalAnswerPlain).toBe('12');
    expect(res.decimalAnswer).toBe(12);
  });
});
