import { ASTNode } from './types';
import { DivisionByZeroError, UnsupportedMathError } from './errors';
import { Fraction, ONE, ZERO } from './rational';

const UNSUPPORTED_IDENTIFIERS = new Set([
  'sqrt',
  'sin',
  'cos',
  'tan',
  'log',
  'ln',
  'abs',
  'exp',
  'pi',
  'lim',
  'int',
  'sum',
  'prod',
  'det',
  'inv',
]);

function parseKey(key: string): Map<string, number> {
  const result = new Map<string, number>();
  if (!key) return result;
  for (const part of key.split('*')) {
    const [name, exponent] = part.split('^');
    result.set(name, exponent ? Number(exponent) : 1);
  }
  return result;
}

function keyFromExponents(exponents: Map<string, number>): string {
  return Array.from(exponents.entries())
    .filter(([, exponent]) => exponent !== 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, exponent]) => (exponent === 1 ? name : `${name}^${exponent}`))
    .join('*');
}

function multiplyKeys(a: string, b: string): string {
  const exponents = parseKey(a);
  for (const [name, exponent] of parseKey(b)) {
    exponents.set(name, (exponents.get(name) ?? 0) + exponent);
  }
  return keyFromExponents(exponents);
}

function normalizeTerms(entries: Iterable<[string, Fraction]>): Map<string, Fraction> {
  const result = new Map<string, Fraction>();
  for (const [key, coefficient] of entries) {
    if (coefficient.isZero()) continue;
    const existing = result.get(key);
    if (!existing) {
      result.set(key, coefficient);
      continue;
    }
    const sum = existing.add(coefficient);
    if (sum.isZero()) result.delete(key);
    else result.set(key, sum);
  }
  return result;
}

function compareExponents(
  a: Map<string, number>,
  b: Map<string, number>,
  variables: string[]
): number {
  for (const variable of variables) {
    const difference = (b.get(variable) ?? 0) - (a.get(variable) ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export class Polynomial {
  private readonly terms: Map<string, Fraction>;

  constructor(terms: Iterable<[string, Fraction]> = []) {
    this.terms = normalizeTerms(terms);
  }

  getTerms(): ReadonlyMap<string, Fraction> {
    return this.terms;
  }

  static zero(): Polynomial {
    return new Polynomial();
  }

  static constant(value: Fraction): Polynomial {
    return value.isZero() ? new Polynomial() : new Polynomial([['', value]]);
  }

  static variable(name: string): Polynomial {
    return new Polynomial([[name, ONE]]);
  }

  static fromTerm(key: string, coefficient: Fraction): Polynomial {
    return new Polynomial([[key, coefficient]]);
  }

  entries(): Array<[string, Fraction]> {
    return Array.from(this.terms.entries());
  }

  isZero(): boolean {
    return this.terms.size === 0;
  }

  variables(): Set<string> {
    const result = new Set<string>();
    for (const key of this.terms.keys()) {
      for (const name of parseKey(key).keys()) result.add(name);
    }
    return result;
  }

  degree(variable: string): number {
    let degree = -Infinity;
    for (const key of this.terms.keys()) {
      degree = Math.max(degree, parseKey(key).get(variable) ?? 0);
    }
    return degree;
  }

  coefficients(variable: string): Fraction[] | null {
    let maxDegree = 0;
    for (const key of this.terms.keys()) {
      const exponents = parseKey(key);
      for (const name of exponents.keys()) {
        if (name !== variable) return null;
      }
      maxDegree = Math.max(maxDegree, exponents.get(variable) ?? 0);
    }
    const result = Array.from({ length: maxDegree + 1 }, () => ZERO);
    for (const [key, coefficient] of this.terms) {
      const exponent = parseKey(key).get(variable) ?? 0;
      result[exponent] = coefficient;
    }
    return result;
  }

  constantValue(): Fraction | null {
    if (this.terms.size === 0) return ZERO;
    if (this.terms.size !== 1) return null;
    const value = this.terms.get('');
    return value ?? null;
  }

  add(other: Polynomial): Polynomial {
    const result = new Map(this.terms);
    for (const [key, coefficient] of other.terms) {
      const existing = result.get(key);
      if (!existing) {
        result.set(key, coefficient);
        continue;
      }
      const sum = existing.add(coefficient);
      if (sum.isZero()) result.delete(key);
      else result.set(key, sum);
    }
    return new Polynomial(result);
  }

  sub(other: Polynomial): Polynomial {
    return this.add(other.neg());
  }

  mul(other: Polynomial): Polynomial {
    const result = new Map<string, Fraction>();
    for (const [leftKey, leftCoefficient] of this.terms) {
      for (const [rightKey, rightCoefficient] of other.terms) {
        const key = multiplyKeys(leftKey, rightKey);
        const coefficient = leftCoefficient.mul(rightCoefficient);
        const existing = result.get(key);
        if (!existing) {
          result.set(key, coefficient);
          continue;
        }
        const sum = existing.add(coefficient);
        if (sum.isZero()) result.delete(key);
        else result.set(key, sum);
      }
    }
    return new Polynomial(result);
  }

  scale(factor: Fraction): Polynomial {
    return new Polynomial(
      Array.from(this.terms.entries()).map(([key, coefficient]) => [key, coefficient.mul(factor)])
    );
  }

  neg(): Polynomial {
    return this.scale(new Fraction(-1n));
  }

  pow(exponent: number): Polynomial {
    if (!Number.isInteger(exponent) || exponent < 0) {
      throw new UnsupportedMathError('Only non-negative integer powers are supported.');
    }
    if (exponent > 32) {
      throw new UnsupportedMathError('Exponent is too large.');
    }
    let result: Polynomial = Polynomial.constant(ONE);
    let base = new Polynomial(this.terms);
    let remaining = exponent;
    while (remaining > 0) {
      if (remaining % 2 === 1) result = result.mul(base);
      base = base.mul(base);
      remaining = Math.floor(remaining / 2);
    }
    return result;
  }

  equals(other: Polynomial): boolean {
    if (this.terms.size !== other.terms.size) return false;
    for (const [key, coefficient] of this.terms) {
      const otherCoefficient = other.terms.get(key);
      if (!otherCoefficient || !coefficient.equals(otherCoefficient)) return false;
    }
    return true;
  }

  toString(): string {
    if (this.terms.size === 0) return '0';
    const variables = Array.from(this.variables()).sort();
    const items = Array.from(this.terms.entries()).map(([key, coefficient]) => {
      const exponents = parseKey(key);
      const totalDegree = Array.from(exponents.values()).reduce((sum, value) => sum + value, 0);
      return { key, coefficient, exponents, totalDegree };
    });
    items.sort((a, b) => {
      if (b.totalDegree !== a.totalDegree) return b.totalDegree - a.totalDegree;
      const exponentOrder = compareExponents(a.exponents, b.exponents, variables);
      if (exponentOrder !== 0) return exponentOrder;
      return a.key.localeCompare(b.key);
    });

    let result = '';
    for (const item of items) {
      const monomial = Array.from(item.exponents.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, exponent]) => (exponent === 1 ? name : `${name}^${exponent}`))
        .join('');
      const absolute = item.coefficient.abs();
      const coefficient = monomial === ''
        ? absolute.toString()
        : absolute.equals(ONE)
          ? ''
          : absolute.isInteger()
            ? absolute.toString()
            : `(${absolute.toString()})`;
      const term = `${coefficient}${monomial}`;
      if (result === '') {
        result = item.coefficient.sign() < 0 ? `-${term}` : term;
      } else {
        result += item.coefficient.sign() < 0 ? ` - ${term}` : ` + ${term}`;
      }
    }
    return result || '0';
  }

  toLatex(): string {
    if (this.terms.size === 0) return '0';
    const variables = Array.from(this.variables()).sort();
    const items = Array.from(this.terms.entries()).map(([key, coefficient]) => {
      const exponents = parseKey(key);
      const totalDegree = Array.from(exponents.values()).reduce((sum, value) => sum + value, 0);
      return { key, coefficient, exponents, totalDegree };
    });
    items.sort((a, b) => {
      if (b.totalDegree !== a.totalDegree) return b.totalDegree - a.totalDegree;
      const exponentOrder = compareExponents(a.exponents, b.exponents, variables);
      if (exponentOrder !== 0) return exponentOrder;
      return a.key.localeCompare(b.key);
    });

    let result = '';
    for (const item of items) {
      const monomial = Array.from(item.exponents.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, exponent]) => (exponent === 1 ? name : `${name}^{${exponent}}`))
        .join('');
      const absolute = item.coefficient.abs();
      const coefficient = monomial === ''
        ? absolute.toLatex()
        : absolute.equals(ONE)
          ? ''
          : absolute.toLatex();
      const term = `${coefficient}${monomial}`;
      if (result === '') {
        result = item.coefficient.sign() < 0 ? `-${term}` : term;
      } else {
        result += item.coefficient.sign() < 0 ? ` - ${term}` : ` + ${term}`;
      }
    }
    return result || '0';
  }

  static fromAst(node: ASTNode): Polynomial {
    if (node.type === 'Number') {
      return Polynomial.constant(Fraction.fromString(node.raw));
    }
    if (node.type === 'Identifier') {
      const name = node.name.toLowerCase();
      if (UNSUPPORTED_IDENTIFIERS.has(name)) {
        throw new UnsupportedMathError(`Unsupported function or identifier '${name}'.`);
      }
      if (!/^[a-z]+$/.test(name)) {
        throw new UnsupportedMathError(`Unsupported identifier '${name}'.`);
      }
      let result = Polynomial.constant(ONE);
      for (const character of name) {
        result = result.mul(Polynomial.variable(character));
      }
      return result;
    }
    if (node.type === 'UnaryOp') {
      const argument = Polynomial.fromAst(node.argument);
      return node.operator === '-' ? argument.neg() : argument;
    }
    if (node.type === 'BinaryOp') {
      const left = Polynomial.fromAst(node.left);
      const right = Polynomial.fromAst(node.right);
      if (node.operator === '+') return left.add(right);
      if (node.operator === '-') return left.sub(right);
      if (node.operator === '*') return left.mul(right);
      if (node.operator === '/') {
        const denominator = right.constantValue();
        if (denominator === null) {
          throw new UnsupportedMathError('Division by a variable is not supported yet.');
        }
        if (denominator.isZero()) throw new DivisionByZeroError();
        return left.scale(ONE.div(denominator));
      }
      if (node.operator === '^') {
        const exponent = right.constantValue();
        if (exponent === null || !exponent.isInteger()) {
          throw new UnsupportedMathError('Only constant integer exponents are supported.');
        }
        const value = Number(exponent.n);
        if (value < 0) {
          throw new UnsupportedMathError('Negative exponents are not supported in polynomial expressions.');
        }
        return left.pow(value);
      }
    }
    if (node.type === 'PostfixOp') {
      const arg = Polynomial.fromAst(node.argument);
      const val = arg.constantValue();
      if (val === null) {
        throw new UnsupportedMathError(`Operator '${node.operator}' is only supported on constant values.`);
      }
      if (node.operator === '%') {
        return Polynomial.constant(val.div(new Fraction(100n)));
      }
      if (node.operator === '!') {
        if (!val.isInteger() || val.n < 0n || val.n > 100n) {
          throw new UnsupportedMathError('Factorial is only defined for non-negative integers <= 100.');
        }
        let fact = 1n;
        for (let i = 2n; i <= val.n; i++) fact *= i;
        return Polynomial.constant(new Fraction(fact));
      }
    }
    if (node.type === 'FunctionCall') {
      const arg = Polynomial.fromAst(node.argument);
      const val = arg.constantValue();
      if (val === null) {
        throw new UnsupportedMathError(`Function '${node.name}' with variables is not supported in polynomials yet.`);
      }
      if (node.name === 'abs') {
        return Polynomial.constant(val.abs());
      }
      if (node.name === 'sqrt') {
        const sq = Fraction.sqrt(val);
        if (sq === null) {
          throw new UnsupportedMathError(`Cannot compute exact rational square root of ${val.toString()}`);
        }
        return Polynomial.constant(sq);
      }
      throw new UnsupportedMathError(`Function '${node.name}' is only supported in arithmetic evaluation.`);
    }
    throw new UnsupportedMathError('Unsupported expression.');
  }
}

function squareRootTerm(
  key: string,
  coefficient: Fraction
): Polynomial | null {
  if (coefficient.sign() <= 0) return null;
  const rootCoefficient = Fraction.sqrt(coefficient);
  if (!rootCoefficient) return null;
  const exponents = parseKey(key);
  const rootExponents = new Map<string, number>();
  for (const [name, exponent] of exponents) {
    if (exponent % 2 !== 0) return null;
    rootExponents.set(name, exponent / 2);
  }
  return Polynomial.fromTerm(keyFromExponents(rootExponents), rootCoefficient);
}

function differenceOfSquares(polynomial: Polynomial): { plain: string; latex: string } | null {
  const entries = polynomial.entries();
  if (entries.length !== 2) return null;
  const positive = entries.filter(([, coefficient]) => coefficient.sign() > 0);
  const negative = entries.filter(([, coefficient]) => coefficient.sign() < 0);
  if (positive.length !== 1 || negative.length !== 1) return null;
  const first = squareRootTerm(positive[0][0], positive[0][1]);
  const second = squareRootTerm(negative[0][0], negative[0][1].abs());
  if (!first || !second) return null;
  if (first.equals(second)) return null;
  const a = first.toString();
  const b = second.toString();
  return {
    plain: `(${a} - ${b})(${a} + ${b})`,
    latex: `(${a} - ${b})(${a} + ${b})`,
  };
}

function formatCoefficientMonomial(coefficient: Fraction, variable: string): string {
  if (coefficient.equals(ONE)) return variable;
  if (coefficient.equals(new Fraction(-1n))) return `-${variable}`;
  if (coefficient.isInteger()) return `${coefficient.toString()}${variable}`;
  return `(${coefficient.toString()})${variable}`;
}

function univariatePerfectSquare(polynomial: Polynomial): { plain: string; latex: string } | null {
  const variables = polynomial.variables();
  if (variables.size !== 1) return null;
  const variable = Array.from(variables)[0];
  const coefficients = polynomial.coefficients(variable);
  if (!coefficients || coefficients.length !== 3) return null;
  const [constant, linear, quadratic] = coefficients;
  if (quadratic.sign() <= 0 || constant.sign() < 0 || linear.isZero()) return null;
  const four = new Fraction(4n);
  if (!linear.mul(linear).equals(quadratic.mul(constant).mul(four))) return null;
  const rootQuadratic = Fraction.sqrt(quadratic);
  const rootConstant = Fraction.sqrt(constant);
  if (!rootQuadratic || !rootConstant) return null;
  const left = formatCoefficientMonomial(rootQuadratic, variable);
  const right = rootConstant.toString();
  const operator = linear.sign() > 0 ? '+' : '-';
  return {
    plain: `(${left} ${operator} ${right})^2`,
    latex: `(${left} ${operator} ${right})^2`,
  };
}

function twoVariablePerfectSquare(polynomial: Polynomial): { plain: string; latex: string } | null {
  const variables = Array.from(polynomial.variables()).sort();
  if (variables.length !== 2) return null;
  const [first, second] = variables;
  const firstPoly = Polynomial.variable(first);
  const secondPoly = Polynomial.variable(second);
  const plus = firstPoly.add(secondPoly).pow(2);
  if (plus.equals(polynomial)) {
    return { plain: `(${first} + ${second})^2`, latex: `(${first} + ${second})^2` };
  }
  const minus = firstPoly.sub(secondPoly).pow(2);
  if (minus.equals(polynomial)) {
    return { plain: `(${first} - ${second})^2`, latex: `(${first} - ${second})^2` };
  }
  return null;
}

export function factorPolynomial(
  polynomial: Polynomial
): { plain: string; latex: string } | null {
  return (
    differenceOfSquares(polynomial) ??
    univariatePerfectSquare(polynomial) ??
    twoVariablePerfectSquare(polynomial)
  );
}
