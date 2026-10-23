import { DivisionByZeroError, MathParseError } from './errors';

function absBig(n: bigint): bigint {
  return n < 0n ? -n : n;
}

function gcdBig(a: bigint, b: bigint): bigint {
  let x = absBig(a);
  let y = absBig(b);
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}

function integerSqrt(n: bigint): bigint | null {
  if (n < 0n) return null;
  if (n < 2n) return n;
  let x0 = n;
  let x1 = (n + 1n) / 2n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x1 + n / x1) / 2n;
  }
  return x0 * x0 === n ? x0 : null;
}

export class Fraction {
  readonly n: bigint;
  readonly d: bigint;

  constructor(n: bigint, d: bigint = 1n) {
    if (d === 0n) throw new DivisionByZeroError();
    let num = n;
    let den = d;
    if (den < 0n) {
      num = -num;
      den = -den;
    }
    const g = gcdBig(num, den);
    this.n = num / g;
    this.d = den / g;
  }

  static fromString(raw: string): Fraction {
    const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(raw.trim());
    if (!match) {
      throw new MathParseError(`Invalid number '${raw}'`, 0);
    }
    const [, sign, whole, fraction = ''] = match;
    if (!whole && !fraction) {
      throw new MathParseError(`Invalid number '${raw}'`, 0);
    }
    const digits = `${whole || '0'}${fraction}`;
    const denominator = 10n ** BigInt(fraction.length);
    const numerator = BigInt(digits) * (sign === '-' ? -1n : 1n);
    return new Fraction(numerator, denominator);
  }

  static sqrt(value: Fraction): Fraction | null {
    if (value.n < 0n) return null;
    const numerator = integerSqrt(value.n);
    const denominator = integerSqrt(value.d);
    if (numerator === null || denominator === null) return null;
    return new Fraction(numerator, denominator);
  }

  add(other: Fraction): Fraction {
    return new Fraction(this.n * other.d + other.n * this.d, this.d * other.d);
  }

  sub(other: Fraction): Fraction {
    return new Fraction(this.n * other.d - other.n * this.d, this.d * other.d);
  }

  mul(other: Fraction): Fraction {
    return new Fraction(this.n * other.n, this.d * other.d);
  }

  div(other: Fraction): Fraction {
    if (other.n === 0n) throw new DivisionByZeroError();
    return new Fraction(this.n * other.d, this.d * other.n);
  }

  neg(): Fraction {
    return new Fraction(-this.n, this.d);
  }

  abs(): Fraction {
    return new Fraction(absBig(this.n), this.d);
  }

  pow(exponent: number): Fraction {
    if (!Number.isInteger(exponent)) {
      throw new Error('Only integer exponents are supported.');
    }
    if (Math.abs(exponent) > 200) {
      throw new Error('Exponent is too large.');
    }
    if (exponent === 0) return new Fraction(1n);
    if (this.n === 0n && exponent < 0) throw new DivisionByZeroError();
    const magnitude = BigInt(Math.abs(exponent));
    const numerator = this.n ** magnitude;
    const denominator = this.d ** magnitude;
    return exponent < 0
      ? new Fraction(denominator, numerator)
      : new Fraction(numerator, denominator);
  }

  isZero(): boolean {
    return this.n === 0n;
  }

  isInteger(): boolean {
    return this.d === 1n;
  }

  sign(): -1 | 0 | 1 {
    if (this.n === 0n) return 0;
    return this.n < 0n ? -1 : 1;
  }

  equals(other: Fraction): boolean {
    return this.n === other.n && this.d === other.d;
  }

  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }

  toString(): string {
    return this.d === 1n ? this.n.toString() : `${this.n}/${this.d}`;
  }

  toLatex(): string {
    if (this.d === 1n) return this.n.toString();
    if (this.n < 0n) {
      return `-\\frac{${absBig(this.n)}}{${this.d}}`;
    }
    return `\\frac{${this.n}}{${this.d}}`;
  }
}

export const ZERO = new Fraction(0n);
export const ONE = new Fraction(1n);
