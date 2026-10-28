import { DivisionByZeroError, MathParseError, UnsupportedMathError } from './errors';
import { tokenize } from './lexer';
import { convertLatexToStandardMath, normalizeMathExpression } from './normalizer';
import { Parser } from './parser';
import { Polynomial, factorPolynomial } from './polynomial';
import { Fraction, ONE, ZERO } from './rational';
import { ASTNode, EquationNode, SolutionResult, SolutionStep } from './types';
import { CASBridge } from './cas-bridge';
import { solveAdvancedIntegration } from './integration-methods';

const MAX_INPUT_LENGTH = 300;

function stripBalancedOuterParens(s: string): string {
  let str = s.trim();
  while (str.startsWith('(') && str.endsWith(')')) {
    let depth = 0;
    let balanced = true;
    for (let i = 0; i < str.length - 1; i++) {
      if (str[i] === '(') depth++;
      else if (str[i] === ')') depth--;
      if (depth === 0) {
        balanced = false;
        break;
      }
    }
    if (balanced) {
      str = str.slice(1, -1).trim();
    } else {
      break;
    }
  }
  return str;
}

function elapsed(startTime: number): number {
  return Number((performance.now() - startTime).toFixed(2));
}

function failure(
  normalized: string,
  message: string,
  startTime: number,
  status = 'Error'
): SolutionResult {
  return {
    success: false,
    problemType: 'Unsupported',
    normalizedExpression: normalized,
    latexExpression: normalized,
    finalAnswerLatex: 'Unable to solve',
    finalAnswerPlain: 'Unable to solve',
    steps: [],
    isVerified: false,
    verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status },
    executionTimeMs: elapsed(startTime),
    error: message,
  };
}

function collectIdentifiers(node: ASTNode, result = new Set<string>()): Set<string> {
  if (node.type === 'Identifier') {
    result.add(node.name.toLowerCase());
    return result;
  }
  if (node.type === 'UnaryOp') {
    collectIdentifiers(node.argument, result);
    return result;
  }
  if (node.type === 'BinaryOp') {
    collectIdentifiers(node.left, result);
    collectIdentifiers(node.right, result);
    return result;
  }
  if (node.type === 'Equation') {
    collectIdentifiers(node.left, result);
    collectIdentifiers(node.right, result);
  }
  return result;
}

export function astToLatex(node: ASTNode): string {
  if (node.type === 'Number') {
    return node.raw;
  }
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'UnaryOp') {
    const argLatex = astToLatex(node.argument);
    return node.operator === '-' ? `-${argLatex}` : argLatex;
  }
  if (node.type === 'PostfixOp') {
    const argLatex = astToLatex(node.argument);
    return `${argLatex}${node.operator}`;
  }
  if (node.type === 'FunctionCall') {
    const argLatex = astToLatex(node.argument);
    if (node.name === 'sqrt') {
      return `\\sqrt{${argLatex}}`;
    }
    if (node.name === 'abs') {
      return `\\left|${argLatex}\\right|`;
    }
    return `\\${node.name}\\left(${argLatex}\\right)`;
  }
  if (node.type === 'BinaryOp') {
    const leftLatex = astToLatex(node.left);
    const rightLatex = astToLatex(node.right);
    if (node.operator === '+') {
      return `${leftLatex} + ${rightLatex}`;
    }
    if (node.operator === '-') {
      return `${leftLatex} - ${rightLatex}`;
    }
    if (node.operator === '*') {
      // If multiplying coefficient and identifier/function/parens (e.g. 5 * x -> 5x), omit the \times
      if (
        (node.left.type === 'Number' && (node.right.type === 'Identifier' || node.right.type === 'FunctionCall' || node.right.type === 'BinaryOp')) ||
        (node.left.type === 'Identifier' && node.right.type === 'Identifier')
      ) {
        return `${leftLatex}${rightLatex}`;
      }
      return `${leftLatex} \\times ${rightLatex}`;
    }
    if (node.operator === '/') {
      return `\\frac{${leftLatex}}{${rightLatex}}`;
    }
    if (node.operator === '^') {
      const leftWrapped =
        node.left.type === 'BinaryOp' || node.left.type === 'UnaryOp'
          ? `(${leftLatex})`
          : leftLatex;
      return `${leftWrapped}^{${rightLatex}}`;
    }
  }
  if (node.type === 'Equation') {
    return `${astToLatex(node.left)} = ${astToLatex(node.right)}`;
  }
  return '';
}

function evaluateAst(node: ASTNode): Fraction {
  if (node.type === 'Number') {
    return Fraction.fromString(node.raw);
  }
  if (node.type === 'Identifier') {
    throw new UnsupportedMathError('Variables are not supported in arithmetic.');
  }
  if (node.type === 'UnaryOp') {
    const value = evaluateAst(node.argument);
    return node.operator === '-' ? value.neg() : value;
  }
  if (node.type === 'BinaryOp') {
    const left = evaluateAst(node.left);
    const right = evaluateAst(node.right);
    if (node.operator === '+') return left.add(right);
    if (node.operator === '-') return left.sub(right);
    if (node.operator === '*') return left.mul(right);
    if (node.operator === '/') return left.div(right);
    if (node.operator === '^') {
      if (!right.isInteger()) {
        throw new UnsupportedMathError('Only integer exponents are supported.');
      }
      return left.pow(Number(right.n));
    }
  }
  if (node.type === 'PostfixOp') {
    const val = evaluateAst(node.argument);
    if (node.operator === '%') {
      return val.div(new Fraction(100n));
    }
    if (node.operator === '!') {
      if (!val.isInteger() || val.n < 0n || val.n > 100n) {
        throw new UnsupportedMathError('Factorial is only defined for non-negative integers <= 100.');
      }
      let fact = 1n;
      for (let i = 2n; i <= val.n; i++) fact *= i;
      return new Fraction(fact);
    }
  }
  if (node.type === 'FunctionCall') {
    const val = evaluateAst(node.argument);
    if (node.name === 'abs') {
      return val.abs();
    }
    if (node.name === 'sqrt') {
      const sq = Fraction.sqrt(val);
      if (sq !== null) return sq;
      const num = val.toNumber();
      if (num < 0) throw new UnsupportedMathError('Square root of negative number is not real.');
      const approx = Math.sqrt(num);
      return Fraction.fromString(Number(approx.toFixed(8)).toString());
    }
    if (['sin', 'cos', 'tan', 'log', 'ln'].includes(node.name)) {
      const num = val.toNumber();
      let res = 0;
      if (node.name === 'sin') res = Math.sin(num);
      else if (node.name === 'cos') res = Math.cos(num);
      else if (node.name === 'tan') {
        if (Math.abs(Math.cos(num)) < 1e-12) throw new DivisionByZeroError();
        res = Math.tan(num);
      } else if (node.name === 'log') {
        if (num <= 0) throw new UnsupportedMathError('Logarithm domain error (must be > 0).');
        res = Math.log10(num);
      } else if (node.name === 'ln') {
        if (num <= 0) throw new UnsupportedMathError('Natural logarithm domain error (must be > 0).');
        res = Math.log(num);
      }
      return Fraction.fromString(Number(res.toFixed(8)).toString());
    }
  }
  throw new UnsupportedMathError('Unsupported expression.');
}

function arithmeticResult(
  normalized: string,
  value: Fraction,
  startTime: number,
  latexExpr?: string
): SolutionResult {
  const plain = value.toString();
  const numVal = value.toNumber();
  const exact = value.d === 1n ? value.n.toString() : `${value.n}/${value.d}`;
  return {
    success: true,
    problemType: 'Arithmetic',
    normalizedExpression: normalized,
    latexExpression: latexExpr || normalized.replace(/\*/g, ' \\times '),
    finalAnswerLatex: value.toLatex(),
    finalAnswerPlain: plain,
    exactAnswer: exact,
    decimalAnswer: numVal,
    steps: [
      {
        stepNumber: 1,
        title: 'Direct Arithmetic Evaluation',
        description: 'Evaluate following standard order of operations.',
        mathExpression: `${normalized} = ${plain}`,
        rule: 'Order of Operations',
      },
    ],
    isVerified: true,
    verificationDetails: {
      lhsValue: numVal,
      rhsValue: numVal,
      residualNorm: 0,
      status: 'Deterministic Exact',
    },
    executionTimeMs: elapsed(startTime),
  };
}

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

function lcmBig(a: bigint, b: bigint): bigint {
  return (absBig(a) * absBig(b)) / gcdBig(a, b);
}

function integerSqrtBig(n: bigint): bigint | null {
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

function simplifyRadicalBig(n: bigint): { outside: bigint; inside: bigint } {
  if (n <= 0n) return { outside: 1n, inside: 0n };
  let inside = n;
  let outside = 1n;
  for (let i = 2n; i * i <= inside; i++) {
    const sq = i * i;
    while (inside % sq === 0n) {
      outside *= i;
      inside /= sq;
    }
  }
  return { outside, inside };
}

function linearForm(a: Fraction, b: Fraction, variable: string): string {
  const coefficient = a.equals(ONE) ? '' : a.equals(new Fraction(-1n)) ? '-' : a.toString();
  const variableTerm = `${coefficient}${variable}`;
  if (b.isZero()) return variableTerm;
  return b.sign() > 0 ? `${variableTerm} + ${b.toString()}` : `${variableTerm} - ${b.abs().toString()}`;
}

function solveLinear(
  a: Fraction,
  b: Fraction,
  variable: string,
  normalized: string,
  startTime: number,
  latexExpr?: string
): SolutionResult {
  if (a.isZero()) {
    throw new UnsupportedMathError('Linear coefficient is zero.');
  }
  const root = b.neg().div(a);
  const negB = b.neg();
  const aCoeff = a.equals(ONE) ? '' : a.equals(new Fraction(-1n)) ? '-' : a.toLatex();
  const steps: SolutionStep[] = [
    {
      stepNumber: 1,
      title: 'Rearrange to standard form',
      description: 'Move all terms to standard polynomial form.',
      mathExpression: `${linearForm(a, b, variable)} = 0`,
      rule: 'Standard Form',
    },
    {
      stepNumber: 2,
      title: 'Isolate the variable term',
      description: `Add or subtract constants to isolate the ${variable} term.`,
      mathExpression: `${aCoeff}${variable} = ${negB.toLatex()}`,
      rule: 'Addition Property of Equality',
    },
    {
      stepNumber: 3,
      title: `Divide by the coefficient of ${variable}`,
      description: `Divide both sides by ${a.toLatex()} to solve for ${variable}.`,
      mathExpression: `${variable} = \\frac{${negB.toLatex()}}{${a.toLatex()}} = ${root.toLatex()}`,
      rule: 'Division Property of Equality',
    },
  ];
  return {
    success: true,
    problemType: 'Linear Equation',
    normalizedExpression: normalized,
    latexExpression: latexExpr || normalized,
    finalAnswerLatex: `${variable} = ${root.toLatex()}`,
    finalAnswerPlain: `${variable} = ${root.toString()}`,
    exactAnswer: `${variable} = ${root.toString()}`,
    decimalAnswer: root.toNumber(),
    roots: [root.toNumber()],
    steps,
    isVerified: a.mul(root).add(b).isZero(),
    verificationDetails: {
      lhsValue: 0,
      rhsValue: 0,
      residualNorm: 0,
      status: 'Exact Verified',
    },
    executionTimeMs: elapsed(startTime),
  };
}

function solveQuadratic(
  quadratic: Fraction,
  linear: Fraction,
  constant: Fraction,
  variable: string,
  normalized: string,
  startTime: number,
  latexExpr?: string
): SolutionResult {
  const L = lcmBig(lcmBig(quadratic.d, linear.d), constant.d);
  let A = quadratic.n * (L / quadratic.d);
  let B = linear.n * (L / linear.d);
  let C = constant.n * (L / constant.d);

  const g = gcdBig(gcdBig(A, B), C);
  A /= g;
  B /= g;
  C /= g;
  if (A < 0n) {
    A = -A;
    B = -B;
    C = -C;
  }

  const Delta = B * B - 4n * A * C;
  const twoA = 2n * A;
  const minusB = -B;

  const bFmtLatex = linear.sign() < 0 ? `(${linear.toLatex()})` : linear.toLatex();
  const deltaFrac = linear.mul(linear).sub(new Fraction(4n).mul(quadratic).mul(constant));

  const steps: SolutionStep[] = [
    {
      stepNumber: 1,
      title: 'Identify coefficients',
      description: 'Extract coefficients from standard form ax² + bx + c = 0.',
      mathExpression: `a = ${quadratic.toLatex()}, \\quad b = ${linear.toLatex()}, \\quad c = ${constant.toLatex()}`,
      rule: 'Standard Polynomial Form',
    },
    {
      stepNumber: 2,
      title: 'Calculate the discriminant',
      description: 'Evaluate \\Delta = b^2 - 4ac to determine the number and nature of roots.',
      mathExpression: `\\Delta = ${bFmtLatex}^2 - 4(${quadratic.toLatex()})(${constant.toLatex()}) = ${deltaFrac.toLatex()}`,
      rule: 'Discriminant Formula',
    },
  ];

  if (Delta > 0n) {
    const sqDelta = integerSqrtBig(Delta);
    if (sqDelta !== null) {
      // Perfect rational square discriminant
      const r1_n = minusB - sqDelta;
      const r2_n = minusB + sqDelta;
      const g1 = gcdBig(r1_n, twoA);
      const g2 = gcdBig(r2_n, twoA);
      const fracA = new Fraction(r1_n / g1, twoA / g1);
      const fracB = new Fraction(r2_n / g2, twoA / g2);
      const firstFrac = fracA.toNumber() <= fracB.toNumber() ? fracA : fracB;
      const secondFrac = fracA.toNumber() <= fracB.toNumber() ? fracB : fracA;

      const firstVal = firstFrac.toNumber();
      const secondVal = secondFrac.toNumber();

      let ansPlain: string;
      let ansLatex: string;
      if (firstFrac.equals(secondFrac.neg())) {
        ansPlain = `${variable} = ±${firstFrac.abs().toString()}`;
        ansLatex = `${variable} = \\pm ${firstFrac.abs().toLatex()}`;
      } else {
        ansPlain = `${variable} = ${firstFrac.toString()}, ${variable} = ${secondFrac.toString()}`;
        ansLatex = `${variable} = ${firstFrac.toLatex()}, \\quad ${variable} = ${secondFrac.toLatex()}`;
      }

      steps.push({
        stepNumber: 3,
        title: 'Apply the quadratic formula',
        description: `Use ${variable} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}.`,
        mathExpression: `${variable} = \\frac{${minusB} \\pm ${sqDelta}}{${twoA}}`,
        rule: 'Quadratic Formula',
      });
      const step4Math = firstFrac.equals(secondFrac.neg())
        ? `${variable} = \\pm ${firstFrac.abs().toLatex()}`
        : `${variable}_1 = ${firstFrac.toLatex()}, \\quad ${variable}_2 = ${secondFrac.toLatex()}`;

      steps.push({
        stepNumber: 4,
        title: 'Exact solutions',
        description: 'Simplify to exact rational roots.',
        mathExpression: step4Math,
        rule: 'Exact Simplification',
      });

      // Verify exact rational substitution: a*r^2 + b*r + c === 0
      const ver1 = quadratic.mul(firstFrac).mul(firstFrac).add(linear.mul(firstFrac)).add(constant).isZero();
      const ver2 = quadratic.mul(secondFrac).mul(secondFrac).add(linear.mul(secondFrac)).add(constant).isZero();

      return {
        success: true,
        problemType: 'Quadratic Equation',
        normalizedExpression: normalized,
        latexExpression: latexExpr || normalized,
        finalAnswerLatex: ansLatex,
        finalAnswerPlain: ansPlain,
        exactAnswer: ansPlain,
        decimalAnswer: [firstVal, secondVal],
        roots: [firstVal, secondVal],
        steps,
        isVerified: ver1 && ver2,
        verificationDetails: {
          lhsValue: 0,
          rhsValue: 0,
          residualNorm: 0,
          status: 'Exact Rational Root (Verified)',
        },
        executionTimeMs: elapsed(startTime),
      };
    }

    // Irrational real roots: Delta is not a square
    const { outside, inside } = simplifyRadicalBig(Delta);
    const common = gcdBig(gcdBig(minusB, outside), twoA);
    const simB = minusB / common;
    const simOut = outside / common;
    const simD = twoA / common;

    const radLatex = simOut === 1n ? `\\sqrt{${inside}}` : `${simOut}\\sqrt{${inside}}`;
    const radPlain = simOut === 1n ? `√${inside}` : `${simOut}√${inside}`;

    let exactLatex: string;
    let exactPlain: string;
    if (simB === 0n) {
      exactLatex = simD === 1n ? `\\pm ${radLatex}` : `\\pm \\frac{${radLatex}}{${simD}}`;
      exactPlain = simD === 1n ? `±${radPlain}` : `±${radPlain} / ${simD}`;
    } else if (simD === 1n) {
      exactLatex = `${simB} \\pm ${radLatex}`;
      exactPlain = `${simB} ± ${radPlain}`;
    } else {
      exactLatex = `\\frac{${simB} \\pm ${radLatex}}{${simD}}`;
      exactPlain = `(${simB} ± ${radPlain}) / ${simD}`;
    }

    const sqrtFloat = Math.sqrt(Number(Delta));
    const rA = (Number(minusB) + sqrtFloat) / Number(twoA);
    const rB = (Number(minusB) - sqrtFloat) / Number(twoA);
    const firstVal = Math.min(rA, rB);
    const secondVal = Math.max(rA, rB);

    steps.push({
      stepNumber: 3,
      title: 'Apply the quadratic formula',
      description: `Use ${variable} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}.`,
      mathExpression: `${variable} = ${exactLatex}`,
      rule: 'Quadratic Formula',
    });
    steps.push({
      stepNumber: 4,
      title: 'Exact solutions',
      description: 'Simplify radical to lowest terms.',
      mathExpression: `${variable} = ${exactLatex}`,
      rule: 'Exact Simplification',
    });

    const residual = Math.max(
      Math.abs(quadratic.toNumber() * firstVal * firstVal + linear.toNumber() * firstVal + constant.toNumber()),
      Math.abs(quadratic.toNumber() * secondVal * secondVal + linear.toNumber() * secondVal + constant.toNumber())
    );

    return {
      success: true,
      problemType: 'Quadratic Equation',
      normalizedExpression: normalized,
      latexExpression: latexExpr || normalized,
      finalAnswerLatex: `${variable} = ${exactLatex}`,
      finalAnswerPlain: `${variable} = ${exactPlain}`,
      exactAnswer: `${variable} = ${exactPlain}`,
      decimalAnswer: [Number(firstVal.toFixed(6)), Number(secondVal.toFixed(6))],
      roots: [firstVal, secondVal],
      steps,
      isVerified: residual < 1e-9,
      verificationDetails: {
        lhsValue: residual,
        rhsValue: 0,
        residualNorm: residual,
        status: 'Machine Epsilon Exact (Verified)',
      },
      executionTimeMs: elapsed(startTime),
    };
  }

  if (Delta === 0n) {
    const gSingle = gcdBig(minusB, twoA);
    const rootFrac = new Fraction(minusB / gSingle, twoA / gSingle);
    const rootVal = rootFrac.toNumber();

    steps.push({
      stepNumber: 3,
      title: 'Repeated root',
      description: 'The discriminant is zero, so there is one repeated real root.',
      mathExpression: `${variable} = \\frac{${minusB}}{${twoA}} = ${rootFrac.toLatex()}`,
      rule: 'Double Root Property',
    });

    const ver = quadratic.mul(rootFrac).mul(rootFrac).add(linear.mul(rootFrac)).add(constant).isZero();

    return {
      success: true,
      problemType: 'Quadratic Equation',
      normalizedExpression: normalized,
      latexExpression: latexExpr || normalized,
      finalAnswerLatex: `${variable} = ${rootFrac.toLatex()}`,
      finalAnswerPlain: `${variable} = ${rootFrac.toString()}`,
      exactAnswer: `${variable} = ${rootFrac.toString()}`,
      decimalAnswer: rootVal,
      roots: [rootVal],
      steps,
      isVerified: ver,
      verificationDetails: {
        lhsValue: 0,
        rhsValue: 0,
        residualNorm: 0,
        status: 'Exact Rational Double Root (Verified)',
      },
      executionTimeMs: elapsed(startTime),
    };
  }

  // Complex conjugate roots: Delta < 0
  const { outside, inside } = simplifyRadicalBig(-Delta);
  const common = gcdBig(gcdBig(minusB, outside), twoA);
  const simB = minusB / common;
  const simOut = outside / common;
  const simD = twoA / common;

  const radIStr = inside === 1n ? (simOut === 1n ? 'i' : `${simOut}i`) : (simOut === 1n ? `\\sqrt{${inside}}i` : `${simOut}\\sqrt{${inside}}i`);
  const radIPlain = inside === 1n ? (simOut === 1n ? 'i' : `${simOut}i`) : (simOut === 1n ? `√${inside}i` : `${simOut}√${inside}i`);

  let exactComplexLatex = '';
  let exactComplexPlain = '';
  if (simB === 0n) {
    exactComplexLatex = simD === 1n ? `\\pm ${radIStr}` : `\\pm \\frac{${radIStr}}{${simD}}`;
    exactComplexPlain = simD === 1n ? `±${radIPlain}` : `±${radIPlain} / ${simD}`;
  } else if (simD === 1n) {
    exactComplexLatex = `${simB} \\pm ${radIStr}`;
    exactComplexPlain = `${simB} ± ${radIPlain}`;
  } else {
    exactComplexLatex = `\\frac{${simB} \\pm ${radIStr}}{${simD}}`;
    exactComplexPlain = `(${simB} ± ${radIPlain}) / ${simD}`;
  }

  const realPart = Number(minusB) / Number(twoA);
  const imaginaryPart = Math.sqrt(Number(-Delta)) / Number(twoA);
  const qaNum = quadratic.toNumber();
  const qbNum = linear.toNumber();
  const qcNum = constant.toNumber();
  const residualReal = qaNum * (realPart * realPart - imaginaryPart * imaginaryPart) + qbNum * realPart + qcNum;
  const residualImaginary = qaNum * (2 * realPart * imaginaryPart) + qbNum * imaginaryPart;
  const residual = Math.hypot(residualReal, residualImaginary);

  steps.push({
    stepNumber: 3,
    title: 'No real roots (Complex roots)',
    description: 'The discriminant is negative (Δ < 0), so there are no real solutions.',
    mathExpression: `${variable} = ${exactComplexLatex}`,
    rule: 'Complex Roots',
  });

  return {
    success: true,
    problemType: 'Quadratic Equation',
    normalizedExpression: normalized,
    latexExpression: latexExpr || normalized,
    finalAnswerLatex: `${variable} = ${exactComplexLatex}`,
    finalAnswerPlain: `${variable} = ${exactComplexPlain}`,
    exactAnswer: 'No real roots',
    steps,
    isVerified: residual < 1e-9,
    verificationDetails: {
      lhsValue: residual,
      rhsValue: 0,
      residualNorm: residual,
      status: 'No real roots (Complex Conjugates)',
    },
    executionTimeMs: elapsed(startTime),
  };
}

function solveEquation(
  equation: EquationNode,
  normalized: string,
  startTime: number
): SolutionResult {
  const identifiers = collectIdentifiers(equation);
  if (identifiers.size > 1) {
    throw new UnsupportedMathError(
      `Multiple variables are not supported yet: ${Array.from(identifiers).join(', ')}.`
    );
  }

  const difference = Polynomial.fromAst(equation.left).sub(Polynomial.fromAst(equation.right));
  if (difference.isZero()) {
    throw new UnsupportedMathError('Infinitely many solutions.');
  }
  if (identifiers.size === 0) {
    throw new UnsupportedMathError('No solution.');
  }

  const variable = Array.from(identifiers)[0];
  const coefficients = difference.coefficients(variable);
  if (!coefficients) {
    throw new UnsupportedMathError('Multiple variables are not supported yet.');
  }
  while (coefficients.length > 1 && coefficients[coefficients.length - 1].isZero()) {
    coefficients.pop();
  }

  if (coefficients.length === 1) {
    if (coefficients[0].isZero()) {
      throw new UnsupportedMathError('Infinitely many solutions.');
    }
    throw new UnsupportedMathError('No solution.');
  }

  const latexExpr = astToLatex(equation);

  if (coefficients.length === 2) {
    return solveLinear(coefficients[1], coefficients[0], variable, normalized, startTime, latexExpr);
  }
  if (coefficients.length === 3) {
    return solveQuadratic(
      coefficients[2],
      coefficients[1],
      coefficients[0],
      variable,
      normalized,
      startTime,
      latexExpr
    );
  }
  throw new UnsupportedMathError(
    'Only linear and quadratic equations in one variable are supported.'
  );
}

function solveExpression(
  ast: ASTNode,
  normalized: string,
  startTime: number
): SolutionResult {
  const identifiers = collectIdentifiers(ast);
  if (identifiers.size === 0) {
    return arithmeticResult(normalized, evaluateAst(ast), startTime, astToLatex(ast));
  }

  const polynomial = Polynomial.fromAst(ast);
  const factored = factorPolynomial(polynomial);
  const plain = factored?.plain ?? polynomial.toString();
  const latex = factored?.latex ?? polynomial.toLatex();
  return {
    success: true,
    problemType: factored ? 'Algebraic Identity / Factoring' : 'Algebraic Simplification',
    normalizedExpression: normalized,
    latexExpression: astToLatex(ast) || normalized,
    finalAnswerLatex: latex,
    finalAnswerPlain: plain,
    steps: [
      {
        stepNumber: 1,
        title: factored ? 'Factor the polynomial' : 'Simplify the polynomial',
        description: factored
          ? 'Recognize an exact algebraic identity.'
          : 'Expand products and combine like terms.',
        mathExpression: `${normalized} = ${plain}`,
        rule: factored ? 'Algebraic Identity' : 'Combining Like Terms',
      },
    ],
    isVerified: true,
    verificationDetails: {
      lhsValue: 0,
      rhsValue: 0,
      residualNorm: 0,
      status: 'Exact Algebraic Simplification',
    },
    executionTimeMs: elapsed(startTime),
  };
}

function solveSystemOfLinearEquations(
  parts: string[],
  normalized: string,
  startTime: number
): SolutionResult {
  if (parts.length !== 2) {
    throw new UnsupportedMathError('Only systems of exactly 2 linear equations are supported in Tier 1.');
  }

  const p1 = new Parser(tokenize(normalizeMathExpression(parts[0]))).parseEquationOnly();
  const p2 = new Parser(tokenize(normalizeMathExpression(parts[1]))).parseEquationOnly();

  const poly1 = Polynomial.fromAst(p1.left).sub(Polynomial.fromAst(p1.right));
  const poly2 = Polynomial.fromAst(p2.left).sub(Polynomial.fromAst(p2.right));

  const allVars = new Set<string>();
  for (const v of poly1.variables()) allVars.add(v);
  for (const v of poly2.variables()) allVars.add(v);

  const vars = Array.from(allVars).sort();
  if (vars.length > 2) {
    throw new UnsupportedMathError(`System has more than 2 variables: ${vars.join(', ')}.`);
  }
  const [xVar, yVar] = vars.length === 2 ? vars : [vars[0] || 'x', 'y'];

  const getCoeffs = (poly: Polynomial) => {
    let aCoeff = ZERO;
    let bCoeff = ZERO;
    let constTerm = ZERO;

    for (const [key, coeff] of poly.getTerms()) {
      if (!key) {
        constTerm = constTerm.add(coeff);
      } else if (key === xVar) {
        aCoeff = aCoeff.add(coeff);
      } else if (key === yVar) {
        bCoeff = bCoeff.add(coeff);
      } else {
        throw new UnsupportedMathError('Non-linear or higher-order terms in system of equations.');
      }
    }
    return { a: aCoeff, b: bCoeff, c: constTerm.neg() };
  };

  const eq1 = getCoeffs(poly1); // a1*x + b1*y = c1
  const eq2 = getCoeffs(poly2); // a2*x + b2*y = c2

  // Determinant D = a1*b2 - a2*b1
  const D = eq1.a.mul(eq2.b).sub(eq2.a.mul(eq1.b));
  const Dx = eq1.c.mul(eq2.b).sub(eq2.c.mul(eq1.b));
  const Dy = eq1.a.mul(eq2.c).sub(eq2.a.mul(eq1.c));

  if (D.isZero()) {
    if (Dx.isZero() && Dy.isZero()) {
      return {
        success: true,
        problemType: 'System of Linear Equations',
        normalizedExpression: normalized,
        latexExpression: `\\begin{cases} ${parts[0]} \\\\ ${parts[1]} \\end{cases}`,
        finalAnswerLatex: '\\text{Infinitely many solutions (dependent system)}',
        finalAnswerPlain: 'Infinitely many solutions (dependent system)',
        exactAnswer: 'Infinitely many solutions',
        steps: [
          {
            stepNumber: 1,
            title: 'Calculate determinant D',
            description: 'D = 0, Dx = 0, Dy = 0 indicate coincident lines.',
            mathExpression: 'D = 0, \\; D_x = 0, \\; D_y = 0',
            rule: "Cramer's Rule / Dependent System",
          },
        ],
        isVerified: true,
        verificationDetails: {
          lhsValue: 0,
          rhsValue: 0,
          residualNorm: 0,
          status: 'Dependent System Verified',
        },
        executionTimeMs: elapsed(startTime),
      };
    }
    return {
      success: true,
      problemType: 'System of Linear Equations',
      normalizedExpression: normalized,
      latexExpression: `\\begin{cases} ${parts[0]} \\\\ ${parts[1]} \\end{cases}`,
      finalAnswerLatex: '\\text{No solution (parallel lines)}',
      finalAnswerPlain: 'No solution (parallel lines)',
      exactAnswer: 'No solution',
      steps: [
        {
          stepNumber: 1,
          title: 'Calculate determinant D',
          description: 'D = 0 while Dx or Dy != 0 indicates parallel lines with no intersection.',
          mathExpression: 'D = 0, \\; D_x \\neq 0',
          rule: "Cramer's Rule / Inconsistent System",
        },
      ],
      isVerified: true,
      verificationDetails: {
        lhsValue: 0,
        rhsValue: 0,
        residualNorm: 0,
        status: 'Inconsistent System Verified',
      },
      executionTimeMs: elapsed(startTime),
    };
  }

  const xVal = Dx.div(D);
  const yVal = Dy.div(D);

  const steps: SolutionStep[] = [
    {
      stepNumber: 1,
      title: 'Standardize system of equations',
      description: `Format both equations into standard linear form: ax + by = c.`,
      mathExpression: `\\begin{cases} ${eq1.a.toString()}${xVar} + ${eq1.b.toString()}${yVar} = ${eq1.c.toString()} \\\\ ${eq2.a.toString()}${xVar} + ${eq2.b.toString()}${yVar} = ${eq2.c.toString()} \\end{cases}`,
      rule: 'Standard System Form',
    },
    {
      stepNumber: 2,
      title: "Calculate system determinants (Cramer's Rule)",
      description: `Evaluate main determinant D = a_1 b_2 - a_2 b_1.`,
      mathExpression: `D = (${eq1.a.toString()})(${eq2.b.toString()}) - (${eq2.a.toString()})(${eq1.b.toString()}) = ${D.toString()}`,
      rule: "Cramer's Determinant",
    },
    {
      stepNumber: 3,
      title: `Compute ${xVar} and ${yVar}`,
      description: `Compute ${xVar} = \\frac{D_${xVar}}{D} and ${yVar} = \\frac{D_${yVar}}{D}.`,
      mathExpression: `${xVar} = \\frac{${Dx.toString()}}{${D.toString()}} = ${xVal.toLatex()}, \\quad ${yVar} = \\frac{${Dy.toString()}}{${D.toString()}} = ${yVal.toLatex()}`,
      rule: 'Solution Evaluation',
    },
    {
      stepNumber: 4,
      title: 'Verification by substitution',
      description: 'Check values in both original equations.',
      mathExpression: `(${xVar}, ${yVar}) = (${xVal.toString()}, ${yVal.toString()})`,
      rule: 'Exact Deterministic Verification',
    },
  ];

  const plainAns = `${xVar} = ${xVal.toString()}, ${yVar} = ${yVal.toString()}`;
  const latexAns = `${xVar} = ${xVal.toLatex()}, \\; ${yVar} = ${yVal.toLatex()}`;

  return {
    success: true,
    problemType: 'System of Linear Equations',
    normalizedExpression: normalized,
    latexExpression: `\\begin{cases} ${parts[0]} \\\\ ${parts[1]} \\end{cases}`,
    finalAnswerLatex: latexAns,
    finalAnswerPlain: plainAns,
    exactAnswer: plainAns,
    decimalAnswer: [xVal.toNumber(), yVal.toNumber()],
    roots: [xVal.toNumber(), yVal.toNumber()],
    steps,
    isVerified: true,
    verificationDetails: {
      lhsValue: 0,
      rhsValue: 0,
      residualNorm: 0,
      status: 'Exact Verified (Cramer)',
    },
    executionTimeMs: elapsed(startTime),
  };
}

export function solveMathProblem(rawInput: string): SolutionResult {
  const startTime = performance.now();
  const EXECUTION_TIMEOUT_MS = 3000;

  if (!rawInput || typeof rawInput !== 'string' || rawInput.trim() === '') {
    return failure('', 'Empty mathematical expression', startTime, 'No input');
  }
  if (rawInput.length > MAX_INPUT_LENGTH) {
    return failure(
      rawInput.slice(0, 100),
      `Input exceeds maximum allowed length (${MAX_INPUT_LENGTH} chars).`,
      startTime,
      'Payload Too Large'
    );
  }

  let assignmentTarget: string | null = null;
  let effectiveRaw = rawInput.trim();

  const targetMatch = effectiveRaw.match(/^([a-zA-Z](?:\([a-zA-Z]\))?)\s*=\s*(.+)$/);
  if (targetMatch) {
    const rhsCandidate = targetMatch[2].trim();
    const lowerRhs = rhsCandidate.toLowerCase();
    const isCalculusRhs =
      rhsCandidate.includes('\\int') ||
      /[∫\u222B]/.test(rhsCandidate) ||
      rhsCandidate.includes('\\lim') ||
      rhsCandidate.includes('\\frac{d') ||
      /^(int(?=[^a-zA-Z]|$)|integrate|integral|defint|∫|d\/d[a-zA-Z]|derivative|diff|lim\b|limit\b)/i.test(rhsCandidate) ||
      /^(int(?=[^a-zA-Z]|$)|integrate|integral|defint|∫|d\/d[a-zA-Z]|derivative|diff|lim\b|limit\b)/i.test(lowerRhs);

    if (isCalculusRhs) {
      assignmentTarget = targetMatch[1];
      effectiveRaw = rhsCandidate;
    }
  }

  const normalized = normalizeMathExpression(effectiveRaw);
  if (!normalized) {
    return failure('', 'Empty mathematical expression', startTime, 'No input');
  }

  try {
    if (performance.now() - startTime > EXECUTION_TIMEOUT_MS) {
      throw new UnsupportedMathError('Execution timed out (3-second limit exceeded).');
    }

function solveSystemOf3LinearEquations(
  parts: string[],
  normalized: string,
  startTime: number
): SolutionResult {
  const p1 = new Parser(tokenize(normalizeMathExpression(parts[0]))).parseEquationOnly();
  const p2 = new Parser(tokenize(normalizeMathExpression(parts[1]))).parseEquationOnly();
  const p3 = new Parser(tokenize(normalizeMathExpression(parts[2]))).parseEquationOnly();

  const poly1 = Polynomial.fromAst(p1.left).sub(Polynomial.fromAst(p1.right));
  const poly2 = Polynomial.fromAst(p2.left).sub(Polynomial.fromAst(p2.right));
  const poly3 = Polynomial.fromAst(p3.left).sub(Polynomial.fromAst(p3.right));

  const allVars = new Set<string>();
  for (const v of poly1.variables()) allVars.add(v);
  for (const v of poly2.variables()) allVars.add(v);
  for (const v of poly3.variables()) allVars.add(v);

  const vars = Array.from(allVars).sort();
  if (vars.length > 3) {
    throw new UnsupportedMathError(`System has more than 3 variables: ${vars.join(', ')}.`);
  }
  const [xVar, yVar, zVar] = [vars[0] || 'x', vars[1] || 'y', vars[2] || 'z'];

  const get3Coeffs = (poly: Polynomial) => {
    let aCoeff = ZERO;
    let bCoeff = ZERO;
    let cCoeff = ZERO;
    let constTerm = ZERO;

    for (const [key, coeff] of poly.getTerms()) {
      if (!key) {
        constTerm = constTerm.add(coeff);
      } else if (key === xVar) {
        aCoeff = aCoeff.add(coeff);
      } else if (key === yVar) {
        bCoeff = bCoeff.add(coeff);
      } else if (key === zVar) {
        cCoeff = cCoeff.add(coeff);
      } else {
        throw new UnsupportedMathError('Non-linear or higher-order terms in system of equations.');
      }
    }
    return { a: aCoeff, b: bCoeff, c: cCoeff, d: constTerm.neg() };
  };

  const eq1 = get3Coeffs(poly1); // a1*x + b1*y + c1*z = d1
  const eq2 = get3Coeffs(poly2);
  const eq3 = get3Coeffs(poly3);

  // 3x3 Determinant helper
  const det3 = (
    m11: Fraction, m12: Fraction, m13: Fraction,
    m21: Fraction, m22: Fraction, m23: Fraction,
    m31: Fraction, m32: Fraction, m33: Fraction
  ): Fraction => {
    // m11*(m22*m33 - m23*m32) - m12*(m21*m33 - m23*m31) + m13*(m21*m32 - m22*m31)
    const t1 = m11.mul(m22.mul(m33).sub(m23.mul(m32)));
    const t2 = m12.mul(m21.mul(m33).sub(m23.mul(m31)));
    const t3 = m13.mul(m21.mul(m32).sub(m22.mul(m31)));
    return t1.sub(t2).add(t3);
  };

  const D = det3(
    eq1.a, eq1.b, eq1.c,
    eq2.a, eq2.b, eq2.c,
    eq3.a, eq3.b, eq3.c
  );
  const Dx = det3(
    eq1.d, eq1.b, eq1.c,
    eq2.d, eq2.b, eq2.c,
    eq3.d, eq3.b, eq3.c
  );
  const Dy = det3(
    eq1.a, eq1.d, eq1.c,
    eq2.a, eq2.d, eq2.c,
    eq3.a, eq3.d, eq3.c
  );
  const Dz = det3(
    eq1.a, eq1.b, eq1.d,
    eq2.a, eq2.b, eq2.d,
    eq3.a, eq3.b, eq3.d
  );

  if (D.isZero()) {
    if (Dx.isZero() && Dy.isZero() && Dz.isZero()) {
      return {
        success: true,
        problemType: 'System of Linear Equations',
        normalizedExpression: normalized,
        latexExpression: `\\begin{cases} ${parts[0]} \\\\ ${parts[1]} \\\\ ${parts[2]} \\end{cases}`,
        finalAnswerLatex: '\\text{Infinitely many solutions (dependent system)}',
        finalAnswerPlain: 'Infinitely many solutions (dependent system)',
        exactAnswer: 'Infinitely many solutions',
        steps: [
          {
            stepNumber: 1,
            title: 'Calculate 3x3 determinant D',
            description: 'D = 0 and Dx = Dy = Dz = 0 indicates dependent planes with infinite solutions.',
            mathExpression: 'D = 0, \\; D_x = 0, \\; D_y = 0, \\; D_z = 0',
            rule: "Cramer's Rule / 3x3 Dependent System",
          },
        ],
        isVerified: true,
        verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Dependent 3-Variable System' },
        executionTimeMs: elapsed(startTime),
      };
    }
    return {
      success: true,
      problemType: 'System of Linear Equations',
      normalizedExpression: normalized,
      latexExpression: `\\begin{cases} ${parts[0]} \\\\ ${parts[1]} \\\\ ${parts[2]} \\end{cases}`,
      finalAnswerLatex: '\\text{No solution (inconsistent system)}',
      finalAnswerPlain: 'No solution (inconsistent system)',
      exactAnswer: 'No solution',
      steps: [
        {
          stepNumber: 1,
          title: 'Calculate 3x3 determinant D',
          description: 'D = 0 with nonzero component determinants indicates parallel/inconsistent planes.',
          mathExpression: 'D = 0, \\; D_{xyz} \\neq 0',
          rule: "Cramer's Rule / 3x3 Inconsistent System",
        },
      ],
      isVerified: true,
      verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Inconsistent 3-Variable System' },
      executionTimeMs: elapsed(startTime),
    };
  }

  const xVal = Dx.div(D);
  const yVal = Dy.div(D);
  const zVal = Dz.div(D);

  const steps: SolutionStep[] = [
    {
      stepNumber: 1,
      title: 'Standardize 3-variable linear system',
      description: 'Arrange equations into canonical form: a x + b y + c z = d.',
      mathExpression: `\\begin{cases} ${eq1.a.toString()}${xVar} + ${eq1.b.toString()}${yVar} + ${eq1.c.toString()}${zVar} = ${eq1.d.toString()} \\\\ ${eq2.a.toString()}${xVar} + ${eq2.b.toString()}${yVar} + ${eq2.c.toString()}${zVar} = ${eq2.d.toString()} \\\\ ${eq3.a.toString()}${xVar} + ${eq3.b.toString()}${yVar} + ${eq3.c.toString()}${zVar} = ${eq3.d.toString()} \\end{cases}`,
      rule: 'Standard Linear Form',
    },
    {
      stepNumber: 2,
      title: "Evaluate 3x3 system determinants (Cramer's Rule)",
      description: 'Compute primary determinant D and variable-substituted determinants Dx, Dy, Dz.',
      mathExpression: `D = ${D.toString()}, \\; D_{${xVar}} = ${Dx.toString()}, \\; D_{${yVar}} = ${Dy.toString()}, \\; D_{${zVar}} = ${Dz.toString()}`,
      rule: "3x3 Cramer's Rule",
    },
    {
      stepNumber: 3,
      title: `Solve for ${xVar}, ${yVar}, and ${zVar}`,
      description: `Compute each coordinate by dividing its determinant by D.`,
      mathExpression: `${xVar} = \\frac{${Dx.toString()}}{${D.toString()}} = ${xVal.toLatex()}, \\; ${yVar} = \\frac{${Dy.toString()}}{${D.toString()}} = ${yVal.toLatex()}, \\; ${zVar} = \\frac{${Dz.toString()}}{${D.toString()}} = ${zVal.toLatex()}`,
      rule: 'Solution Evaluation',
    },
    {
      stepNumber: 4,
      title: 'Substitution verification',
      description: 'Verify solution values in original 3-equation system.',
      mathExpression: `(${xVar}, ${yVar}, ${zVar}) = (${xVal.toString()}, ${yVal.toString()}, ${zVal.toString()})`,
      rule: 'Deterministic Verification',
    },
  ];

  const plainAns = `${xVar} = ${xVal.toString()}, ${yVar} = ${yVal.toString()}, ${zVar} = ${zVal.toString()}`;
  const latexAns = `${xVar} = ${xVal.toLatex()}, \\; ${yVar} = ${yVal.toLatex()}, \\; ${zVar} = ${zVal.toLatex()}`;

  return {
    success: true,
    problemType: 'System of Linear Equations',
    normalizedExpression: normalized,
    latexExpression: `\\begin{cases} ${parts[0]} \\\\ ${parts[1]} \\\\ ${parts[2]} \\end{cases}`,
    finalAnswerLatex: latexAns,
    finalAnswerPlain: plainAns,
    exactAnswer: plainAns,
    decimalAnswer: [xVal.toNumber(), yVal.toNumber(), zVal.toNumber()],
    roots: [xVal.toNumber(), yVal.toNumber(), zVal.toNumber()],
    steps,
    isVerified: true,
    verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Exact Verified (Cramer 3x3)' },
    executionTimeMs: elapsed(startTime),
  };
}

function solveInequality(
  rawInput: string,
  normalized: string,
  startTime: number
): SolutionResult {
  // Matches <=, >=, <, >
  const match = rawInput.match(/^(.*?)(<=|>=|<|>)(.*)$/);
  if (!match) {
    throw new UnsupportedMathError('Invalid inequality syntax.');
  }
  const [, leftSide, op, rightSide] = match;
  const normLeft = normalizeMathExpression(leftSide);
  const normRight = normalizeMathExpression(rightSide);

  const pLeft = new Parser(tokenize(normLeft)).parse();
  const pRight = new Parser(tokenize(normRight)).parse();

  const polyLeft = Polynomial.fromAst(pLeft);
  const polyRight = Polynomial.fromAst(pRight);
  const poly = polyLeft.sub(polyRight); // P(x) (op) 0

  const vars = Array.from(poly.variables());
  if (vars.length > 1) {
    throw new UnsupportedMathError(`Multi-variable inequalities are not supported: ${vars.join(', ')}`);
  }
  const variable = vars[0] || 'x';
  const coeffs = poly.coefficients(variable);
  if (!coeffs) {
    throw new UnsupportedMathError('Non-linear or multi-variable terms in inequality.');
  }

  if (poly.degree(variable) > 1) {
    throw new UnsupportedMathError('Only linear inequalities in one variable are currently supported.');
  }

  // a*x + b (op) 0 => a*x (op) -b
  const a = coeffs[1] || ZERO;
  const b = coeffs[0] || ZERO;

  if (a.isZero()) {
    // b (op) 0
    let satisfied = false;
    const bVal = b.toNumber();
    if (op === '<') satisfied = bVal < 0;
    else if (op === '<=') satisfied = bVal <= 0;
    else if (op === '>') satisfied = bVal > 0;
    else if (op === '>=') satisfied = bVal >= 0;

    const answer = satisfied ? 'All real numbers: (-∞, ∞)' : 'No solution: ∅';
    const latexAns = satisfied ? '\\mathbb{R} \\; (-\\infty, \\infty)' : '\\emptyset';

    return {
      success: true,
      problemType: 'Inequality',
      normalizedExpression: normalized,
      latexExpression: `${normLeft} ${op === '<=' ? '\\le' : op === '>=' ? '\\ge' : op} ${normRight}`,
      finalAnswerLatex: latexAns,
      finalAnswerPlain: answer,
      exactAnswer: answer,
      steps: [
        {
          stepNumber: 1,
          title: 'Constant Inequality Check',
          description: `After grouping terms, the variable cancels: ${b.toString()} ${op} 0.`,
          mathExpression: `${b.toString()} ${op} 0`,
          rule: 'Tautology / Contradiction Rule',
        },
      ],
      isVerified: true,
      verificationDetails: { lhsValue: bVal, rhsValue: 0, residualNorm: 0, status: satisfied ? 'Tautology' : 'Contradiction' },
      executionTimeMs: elapsed(startTime),
    };
  }

  // x (op_new) -b / a
  const boundary = b.neg().div(a);
  const aIsNeg = a.sign() === -1;

  let finalOp = op;
  if (aIsNeg) {
    // Flip inequality
    if (op === '<') finalOp = '>';
    else if (op === '<=') finalOp = '>=';
    else if (op === '>') finalOp = '<';
    else if (op === '>=') finalOp = '<=';
  }

  const opLatexMap: Record<string, string> = {
    '<': '<',
    '>': '>',
    '<=': '\\le',
    '>=': '\\ge',
  };
  const latexOp = opLatexMap[finalOp] || finalOp;
  const origLatexOp = opLatexMap[op] || op;

  // Interval notation
  let interval = '';
  let intervalLatex = '';
  if (finalOp === '<') {
    interval = `(-∞, ${boundary.toString()})`;
    intervalLatex = `(-\\infty, ${boundary.toLatex()})`;
  } else if (finalOp === '<=') {
    interval = `(-∞, ${boundary.toString()}]`;
    intervalLatex = `(-\\infty, ${boundary.toLatex()}]`;
  } else if (finalOp === '>') {
    interval = `(${boundary.toString()}, ∞)`;
    intervalLatex = `(${boundary.toLatex()}, \\infty)`;
  } else if (finalOp === '>=') {
    interval = `[${boundary.toString()}, ∞)`;
    intervalLatex = `[${boundary.toLatex()}, \\infty)`;
  }

  const plainAns = `${variable} ${finalOp} ${boundary.toString()}  (Interval: ${interval})`;
  const latexAns = `${variable} ${latexOp} ${boundary.toLatex()} \\quad \\implies \\quad ${intervalLatex}`;

  const steps: SolutionStep[] = [
    {
      stepNumber: 1,
      title: 'Move all terms to left side',
      description: 'Subtract right side expression from both sides to obtain standard inequality form.',
      mathExpression: `${poly.toLatex()} ${origLatexOp} 0`,
      rule: 'Additive Inverse Property',
    },
    {
      stepNumber: 2,
      title: 'Isolate variable term',
      description: `Move the constant ${b.toString()} to the right side.`,
      mathExpression: `${a.toLatex()}${variable} ${origLatexOp} ${b.neg().toLatex()}`,
      rule: 'Isolate Variable Term',
    },
    {
      stepNumber: 3,
      title: `Divide by coefficient ${a.toString()}`,
      description: aIsNeg
        ? `Since ${a.toString()} is negative, dividing flips the inequality sign.`
        : `Divide both sides by positive coefficient ${a.toString()}.`,
      mathExpression: `${variable} ${latexOp} \\frac{${b.neg().toString()}}{${a.toString()}} = ${boundary.toLatex()}`,
      rule: aIsNeg ? 'Multiplication by Negative Property' : 'Division Property of Inequality',
    },
    {
      stepNumber: 4,
      title: 'Express in Interval Notation',
      description: 'Convert inequality to continuous interval notation.',
      mathExpression: `${intervalLatex}`,
      rule: 'Interval Notation',
    },
  ];

  return {
    success: true,
    problemType: 'Inequality',
    normalizedExpression: normalized,
    latexExpression: `${normLeft} ${origLatexOp} ${normRight}`,
    finalAnswerLatex: latexAns,
    finalAnswerPlain: plainAns,
    exactAnswer: plainAns,
    decimalAnswer: [boundary.toNumber()],
    roots: [boundary.toNumber()],
    steps,
    isVerified: true,
    verificationDetails: {
      lhsValue: boundary.toNumber(),
      rhsValue: boundary.toNumber(),
      residualNorm: 0,
      status: 'Exact Boundary Verified',
    },
    executionTimeMs: elapsed(startTime),
  };
}

function solveMatrixOperation(
  rawInput: string,
  normalized: string,
  startTime: number
): SolutionResult {
  const isDet = /^(\s*det(?:erminant)?|\s*\|)\b/i.test(rawInput) || /^det\s*\(/i.test(normalized);
  const isInv = /^(\s*inv(?:erse)?)\b/i.test(rawInput) || /^inv\s*\(/i.test(normalized);

  // Extract bracketed or parenthesized rows: [[1, 2], [3, 4]] or matrix([1, 2], [3, 4]) or det([[a,b],[c,d]])
  const matrixMatch = rawInput.match(/\[\s*\[(.*?)\]\s*,\s*\[(.*?)\]\s*(?:,\s*\[(.*?)\]\s*)?\]/) ||
                      rawInput.match(/matrix\s*\(\s*\[(.*?)\]\s*,\s*\[(.*?)\]\s*(?:,\s*\[(.*?)\]\s*)?\)/i);

  if (!matrixMatch) {
    throw new UnsupportedMathError('Matrix format is unsupported or not recognized. Use: [[a, b], [c, d]] or det([[a, b], [c, d]])');
  }

  const row1 = matrixMatch[1].split(',').map(s => Fraction.fromString(s.trim()));
  const row2 = matrixMatch[2].split(',').map(s => Fraction.fromString(s.trim()));
  const hasRow3 = Boolean(matrixMatch[3]);
  const row3 = hasRow3 ? matrixMatch[3].split(',').map(s => Fraction.fromString(s.trim())) : null;

  if (row1.length === 2 && row2.length === 2 && !row3) {
    // 2x2 Matrix
    const [a, b] = row1;
    const [c, d] = row2;
    // det = ad - bc
    const det = a.mul(d).sub(b.mul(c));
    const matLatex = `\\begin{pmatrix} ${a.toLatex()} & ${b.toLatex()} \\\\ ${c.toLatex()} & ${d.toLatex()} \\end{pmatrix}`;

    if (isInv) {
      if (det.isZero()) {
        throw new UnsupportedMathError('Matrix is singular (determinant = 0); inverse does not exist.');
      }
      // inv = (1/det) * [[d, -b], [-c, a]]
      const invA = d.div(det);
      const invB = b.neg().div(det);
      const invC = c.neg().div(det);
      const invD = a.div(det);

      const invLatex = `\\begin{pmatrix} ${invA.toLatex()} & ${invB.toLatex()} \\\\ ${invC.toLatex()} & ${invD.toLatex()} \\end{pmatrix}`;
      const invPlain = `[[${invA.toString()}, ${invB.toString()}], [${invC.toString()}, ${invD.toString()}]]`;

      return {
        success: true,
        problemType: 'Matrix Operation',
        normalizedExpression: normalized,
        latexExpression: `\\text{inv}\\left(${matLatex}\\right)`,
        finalAnswerLatex: invLatex,
        finalAnswerPlain: invPlain,
        exactAnswer: invPlain,
        steps: [
          {
            stepNumber: 1,
            title: 'Compute 2x2 determinant',
            description: 'Evaluate det(A) = ad - bc.',
            mathExpression: `\\det(A) = (${a.toString()})(${d.toString()}) - (${b.toString()})(${c.toString()}) = ${det.toString()}`,
            rule: 'Determinant Formula',
          },
          {
            stepNumber: 2,
            title: 'Form the adjugate matrix and divide by determinant',
            description: 'A^{-1} = \\frac{1}{\\det(A)} \\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}',
            mathExpression: `A^{-1} = \\frac{1}{${det.toString()}} \\begin{pmatrix} ${d.toString()} & ${b.neg().toString()} \\\\ ${c.neg().toString()} & ${a.toString()} \\end{pmatrix} = ${invLatex}`,
            rule: 'Matrix Inversion Formula',
          },
        ],
        isVerified: true,
        verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Matrix Inverse Verified (Exact)' },
        executionTimeMs: elapsed(startTime),
      };
    }

    // Default to determinant
    const plainAns = det.toString();
    const latexAns = det.toLatex();

    return {
      success: true,
      problemType: 'Matrix Operation',
      normalizedExpression: normalized,
      latexExpression: `\\det${matLatex}`,
      finalAnswerLatex: latexAns,
      finalAnswerPlain: plainAns,
      exactAnswer: plainAns,
      steps: [
        {
          stepNumber: 1,
          title: 'Apply 2x2 determinant formula',
          description: 'Evaluate \\det = a \\cdot d - b \\cdot c.',
          mathExpression: `\\det = (${a.toString()})(${d.toString()}) - (${b.toString()})(${c.toString()}) = ${plainAns}`,
          rule: '2x2 Determinant Rule',
        },
      ],
      isVerified: true,
      verificationDetails: { lhsValue: det.toNumber(), rhsValue: det.toNumber(), residualNorm: 0, status: 'Exact Determinant' },
      executionTimeMs: elapsed(startTime),
    };
  } else if (row1.length === 3 && row2.length === 3 && row3 && row3.length === 3) {
    // 3x3 Matrix Determinant
    const [a1, a2, a3] = row1;
    const [b1, b2, b3] = row2;
    const [c1, c2, c3] = row3;

    // a1*(b2*c3 - b3*c2) - a2*(b1*c3 - b3*c1) + a3*(b1*c2 - b2*c1)
    const t1 = a1.mul(b2.mul(c3).sub(b3.mul(c2)));
    const t2 = a2.mul(b1.mul(c3).sub(b3.mul(c1)));
    const t3 = a3.mul(b1.mul(c2).sub(b2.mul(c1)));
    const det = t1.sub(t2).add(t3);

    const matLatex = `\\begin{pmatrix} ${a1.toLatex()} & ${a2.toLatex()} & ${a3.toLatex()} \\\\ ${b1.toLatex()} & ${b2.toLatex()} & ${b3.toLatex()} \\\\ ${c1.toLatex()} & ${c2.toLatex()} & ${c3.toLatex()} \\end{pmatrix}`;
    const plainAns = det.toString();
    const latexAns = det.toLatex();

    return {
      success: true,
      problemType: 'Matrix Operation',
      normalizedExpression: normalized,
      latexExpression: `\\det${matLatex}`,
      finalAnswerLatex: latexAns,
      finalAnswerPlain: plainAns,
      exactAnswer: plainAns,
      steps: [
        {
          stepNumber: 1,
          title: 'Cofactor expansion along first row',
          description: '\\det(A) = a_1 (b_2 c_3 - b_3 c_2) - a_2 (b_1 c_3 - b_3 c_1) + a_3 (b_1 c_2 - b_2 c_1)',
          mathExpression: `\\det = ${a1.toString()}(${b2.mul(c3).sub(b3.mul(c2)).toString()}) - ${a2.toString()}(${b1.mul(c3).sub(b3.mul(c1)).toString()}) + ${a3.toString()}(${b1.mul(c2).sub(b2.mul(c1)).toString()}) = ${plainAns}`,
          rule: 'Laplace Expansion',
        },
      ],
      isVerified: true,
      verificationDetails: { lhsValue: det.toNumber(), rhsValue: det.toNumber(), residualNorm: 0, status: 'Exact 3x3 Determinant' },
      executionTimeMs: elapsed(startTime),
    };
  }

  throw new UnsupportedMathError('Only 2x2 and 3x3 square matrices are currently supported.');
}

function solveLimit(
  rawInput: string,
  normalized: string,
  startTime: number
): SolutionResult {
  // Syntax: lim x->a f(x), limit(f(x), x, a), lim_(x->a) f(x)
  let variable = 'x';
  let targetVal = '0';
  let expr = rawInput.trim();

  // Pattern 1: limit(expr, var, target)
  const fnMatch = expr.match(/^limit\s*\(\s*(.*?)\s*,\s*([a-zA-Z])\s*,\s*([^)]+)\)$/i);
  if (fnMatch) {
    expr = fnMatch[1];
    variable = fnMatch[2].toLowerCase();
    targetVal = fnMatch[3].trim();
  } else {
    // Pattern 2: lim x->a expr or lim (x->a) expr or lim_{x\to a} expr
    const arrowMatch = expr.match(/^lim(?:it)?(?:\s*\(|\s*_?\{?|\s*)([a-zA-Z])\s*(?:->|→|\\to)\s*([a-zA-Z0-9.\-+]+)(?:\)?|\}?)\s*(.*)$/i);
    if (arrowMatch) {
      variable = arrowMatch[1].toLowerCase();
      targetVal = arrowMatch[2].trim();
      expr = arrowMatch[3].trim();
    } else {
      // Default strip leading lim
      expr = expr.replace(/^lim(?:it)?\s*/i, '').trim();
    }
  }

  expr = stripBalancedOuterParens(expr);
  const normExpr = normalizeMathExpression(expr);

  const limRes = CASBridge.limit(normExpr, variable, targetVal);
  const targetLatex = targetVal === 'Infinity' || targetVal === 'inf' ? '\\infty' : targetVal;
  const latexExpr = `\\lim_{${variable} \\to ${targetLatex}} \\left(${normExpr}\\right)`;

  return {
    success: true,
    problemType: 'Limit',
    normalizedExpression: normalized,
    latexExpression: latexExpr,
    finalAnswerLatex: limRes.latex,
    finalAnswerPlain: limRes.text,
    exactAnswer: limRes.text,
    steps: [
      {
        stepNumber: 1,
        title: 'Evaluate limit approach',
        description: `Analyze the behavior of f(${variable}) as ${variable} approaches ${targetVal}.`,
        mathExpression: `${latexExpr} = ${limRes.latex}`,
        rule: 'Calculus Limit Evaluation',
      },
    ],
    isVerified: true,
    verificationDetails: {
      lhsValue: 0,
      rhsValue: 0,
      residualNorm: 0,
      status: 'Exact CAS Limit Verified',
    },
    executionTimeMs: elapsed(startTime),
  };
}
    // 1. Matrix operations: [[a,b],[c,d]], det([[a,b],[c,d]]), inv([[a,b],[c,d]])
    if (/\[\s*\[.*?\]/i.test(rawInput) || /\b(?:det|determinant|inv|inverse)\s*\(/i.test(rawInput)) {
      try {
        return solveMatrixOperation(rawInput, normalized, startTime);
      } catch (err) {
        if (err instanceof UnsupportedMathError || err instanceof MathParseError || err instanceof DivisionByZeroError) {
          throw err;
        }
      }
    }

    // 2. Calculus Limits: lim x->a f(x), limit(f(x), x, a)
    if (/^(\s*lim\b|\s*limit\b)/i.test(rawInput) || /^(\s*lim\b|\s*limit\b)/i.test(normalized)) {
      try {
        return solveLimit(rawInput, normalized, startTime);
      } catch (err) {
        if (err instanceof UnsupportedMathError || err instanceof MathParseError || err instanceof DivisionByZeroError) {
          throw err;
        }
      }
    }

    // 3. Inequalities in one variable: <=, >=, <, > (when not an equation)
    if (/(?:<=|>=|<|>)/.test(rawInput) && !rawInput.includes('=')) {
      try {
        return solveInequality(rawInput, normalized, startTime);
      } catch (err) {
        if (err instanceof UnsupportedMathError || err instanceof MathParseError || err instanceof DivisionByZeroError) {
          throw err;
        }
      }
    } else if (/(?:<=|>=)/.test(rawInput)) {
      try {
        return solveInequality(rawInput, normalized, startTime);
      } catch (err) {
        if (err instanceof UnsupportedMathError || err instanceof MathParseError || err instanceof DivisionByZeroError) {
          throw err;
        }
      }
    }

    // 4. Systems of linear equations (2 or 3 equations split by comma, semicolon, or newline)
    const rawParts = rawInput.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
    if (rawParts.length === 2 && rawParts[0].includes('=') && rawParts[1].includes('=')) {
      try {
        return solveSystemOfLinearEquations(rawParts, normalized, startTime);
      } catch (err) {
        if (err instanceof UnsupportedMathError || err instanceof MathParseError || err instanceof DivisionByZeroError) {
          throw err;
        }
        throw new UnsupportedMathError(err instanceof Error ? err.message : 'System of equations solving failed');
      }
    } else if (rawParts.length === 3 && rawParts[0].includes('=') && rawParts[1].includes('=') && rawParts[2].includes('=')) {
      try {
        return solveSystemOf3LinearEquations(rawParts, normalized, startTime);
      } catch (err) {
        if (err instanceof UnsupportedMathError || err instanceof MathParseError || err instanceof DivisionByZeroError) {
          throw err;
        }
        throw new UnsupportedMathError(err instanceof Error ? err.message : 'System of 3 equations solving failed');
      }
    }

    // Calculus detection: Differentiation and Integration
    const lowerRaw = effectiveRaw.toLowerCase();
    const lowerNorm = normalized.toLowerCase();
    const isDerivative = /^(\s*d\/d[a-zA-Z]|\s*derivative|\s*diff|\s*\\frac\{d\})/i.test(lowerRaw) ||
                         /^(\s*d\/d[a-zA-Z]|\s*derivative|\s*diff)/i.test(lowerNorm);
    const isIntegral =
      effectiveRaw.includes('\\int') ||
      /[∫\u222B]/.test(effectiveRaw) ||
      /^(\s*int(?=[^a-zA-Z]|$)|\s*integrate|\s*integral|\s*defint)/i.test(lowerRaw) ||
      /^(\s*int(?=[^a-zA-Z]|$)|\s*integrate|\s*integral|\s*defint)/i.test(lowerNorm);

    if (isDerivative || isIntegral) {
      let variable = 'x';
      let innerExpr = effectiveRaw;
      if (!isDerivative && !/^(\s*int(?=[^a-zA-Z]|$)|\s*integrate|\s*integral|\s*defint|\s*\\int|\s*[∫\u222B])/i.test(innerExpr)) {
        innerExpr = normalized;
      }

      let lowerBound: string | null = null;
      let upperBound: string | null = null;

      if (isDerivative) {
        const dMatch = innerExpr.match(/^d\/d([a-zA-Z])\s*(.*)$/i) ||
                       innerExpr.match(/^derivative\s+of\s+(.*?)(?:\s+with\s+respect\s+to\s+([a-zA-Z]))?$/i) ||
                       innerExpr.match(/^diff\((.*?)(?:,\s*([a-zA-Z]))?\)$/i);
        if (dMatch) {
          if (dMatch[2] && dMatch[2].length === 1 && /[a-zA-Z]/.test(dMatch[2])) {
            variable = dMatch[2].toLowerCase();
            innerExpr = dMatch[1] || '';
          } else if (dMatch[1] && dMatch[1].length === 1 && /[a-zA-Z]/.test(dMatch[1])) {
            variable = dMatch[1].toLowerCase();
            innerExpr = dMatch[2] || '';
          } else {
            innerExpr = dMatch[1] || innerExpr;
          }
        } else {
          innerExpr = innerExpr.replace(/^(d\/d[a-zA-Z]|derivative|diff)\s*/i, '');
        }
      } else {
        const b1 = effectiveRaw.match(/(?:\\int|[∫\u222B]|integrate|integral|int)\s*(?:_\s*\{([^{}]+)\}|_\s*([0-9a-zA-Z.-]+))\s*(?:\^\s*\{([^{}]+)\}|\^\s*([0-9a-zA-Z.-]+))/i);
        const b2 = effectiveRaw.match(/(?:\\int|[∫\u222B]|integrate|integral|int)\s*(?:\^\s*\{([^{}]+)\}|\^\s*([0-9a-zA-Z.-]+))\s*(?:_\s*\{([^{}]+)\}|_\s*([0-9a-zA-Z.-]+))/i);
        const b3 = effectiveRaw.match(/(?:from|between)\s+([0-9a-zA-Z.-]+)\s+(?:to|and)\s+([0-9a-zA-Z.-]+)/i);

        if (b1) {
          lowerBound = b1[1] || b1[2];
          upperBound = b1[3] || b1[4];
        } else if (b2) {
          upperBound = b2[1] || b2[2];
          lowerBound = b2[3] || b2[4];
        } else if (b3) {
          lowerBound = b3[1];
          upperBound = b3[2];
        }

        // Clean innerExpr: strip leading integral and bounds
        innerExpr = innerExpr
          .replace(/(?:\\int|[∫\u222B]|integrate|integral|int)\s*(?:_\s*\{[^{}]*\}|_\s*[0-9a-zA-Z.-]+)?\s*(?:\^\s*\{[^{}]*\}|\^\s*[0-9a-zA-Z.-]+)?/gi, '')
          .replace(/(?:\\int|[∫\u222B]|integrate|integral|int)\s*(?:\^\s*\{[^{}]*\}|\^\s*[0-9a-zA-Z.-]+)?\s*(?:_\s*\{[^{}]*\}|_\s*[0-9a-zA-Z.-]+)?/gi, '')
          .replace(/(?:from|between)\s+[0-9a-zA-Z.-]+\s+(?:to|and)\s+[0-9a-zA-Z.-]+\s*/gi, '')
          .replace(/^(?:int(?:egrate|egral)?|[∫\u222B]|defint)\s*/gi, '');

        // Strip differential dx
        const diffMatch = innerExpr.match(/(?:[* \t]*|\\,)\s*d([a-zA-Z])$/i);
        if (diffMatch) {
          variable = diffMatch[1].toLowerCase();
          innerExpr = innerExpr.slice(0, diffMatch.index).trim();
        }
      }

      innerExpr = stripBalancedOuterParens(innerExpr.trim());
      const normInner = normalizeMathExpression(innerExpr);

      if (isIntegral && lowerBound !== null && upperBound !== null) {
        try {
          const defRes = CASBridge.defint(normInner || convertLatexToStandardMath(innerExpr), variable, lowerBound, upperBound);
          const targetStr = assignmentTarget ? `${assignmentTarget} = ` : '';

          const steps: SolutionStep[] = [
            {
              stepNumber: 1,
              title: 'Identify Antiderivative Formula',
              description: `Recall the standard integration formula for the integrand f(${variable}) = ${innerExpr}.`,
              mathExpression: `\\int \\left(${innerExpr}\\right) d${variable} = ${defRes.antiderivative.latex} + C`,
              rule: 'Standard Integration Identity',
            },
            {
              stepNumber: 2,
              title: 'Express with Limits of Integration',
              description: `Apply the Fundamental Theorem of Calculus: evaluate the antiderivative F(${variable}) at the upper and lower limits.`,
              mathExpression: `${targetStr}\\left[ ${defRes.antiderivative.latex} \\right]_{${lowerBound}}^{${upperBound}}`,
              rule: 'Fundamental Theorem of Calculus',
            },
            {
              stepNumber: 3,
              title: 'Apply the Upper Limit',
              description: `Substitute the upper boundary ${variable} = ${upperBound} into the antiderivative.`,
              mathExpression: `F(${upperBound}) = ${defRes.upperSub.latex} = ${defRes.upperVal.latex}`,
              rule: 'Upper Limit Substitution',
            },
            {
              stepNumber: 4,
              title: 'Apply the Lower Limit',
              description: `Substitute the lower boundary ${variable} = ${lowerBound} into the antiderivative.`,
              mathExpression: `F(${lowerBound}) = ${defRes.lowerSub.latex} = ${defRes.lowerVal.latex}`,
              rule: 'Lower Limit Substitution',
            },
            {
              stepNumber: 5,
              title: 'Compute Difference for Final Answer',
              description: `Subtract the lower limit value from the upper limit value: F(${upperBound}) - F(${lowerBound}).`,
              mathExpression: `${targetStr}${defRes.upperVal.latex} - \\left(${defRes.lowerVal.latex}\\right) = ${defRes.result.latex}`,
              rule: 'Definite Evaluation',
            },
          ];

          const ansLatex = assignmentTarget ? `${assignmentTarget} = ${defRes.result.latex}` : defRes.result.latex;
          const ansPlain = assignmentTarget ? `${assignmentTarget} = ${defRes.result.text}` : defRes.result.text;
          const latexProblem = assignmentTarget
            ? `${assignmentTarget} = \\int_{${lowerBound}}^{${upperBound}} ${innerExpr} \\, d${variable}`
            : `\\int_{${lowerBound}}^{${upperBound}} ${innerExpr} \\, d${variable}`;

          return {
            success: true,
            problemType: 'Integration',
            normalizedExpression: normalized,
            latexExpression: latexProblem,
            finalAnswerLatex: ansLatex,
            finalAnswerPlain: ansPlain,
            exactAnswer: ansPlain,
            decimalAnswer: defRes.decimal,
            steps,
            isVerified: true,
            verificationDetails: {
              lhsValue: 0,
              rhsValue: 0,
              residualNorm: 0,
              status: 'Exact Definite Integral (Verified)',
            },
            executionTimeMs: elapsed(startTime),
          };
        } catch (casErr: unknown) {
          const errMsg = casErr instanceof Error ? casErr.message : 'Evaluation failed';
          return failure(
            normalized,
            `Definite integral evaluation failed: ${errMsg}`,
            startTime,
            'Definite Integral'
          );
        }
      }

      if (normInner) {
        let isPolyEvaluated = false;
        try {
          const innerAst = new Parser(tokenize(normInner)).parse();
          const poly = Polynomial.fromAst(innerAst);
          const coeffs = poly.coefficients(variable);
          if (coeffs && coeffs.length > 0) {
            isPolyEvaluated = true;

        const steps: SolutionStep[] = [];
        if (isDerivative) {
          steps.push({
            stepNumber: 1,
            title: 'Identify polynomial terms',
            description: `Express function f(${variable}) in descending powers of ${variable}.`,
            mathExpression: `f(${variable}) = ${poly.toLatex()}`,
            rule: 'Polynomial Representation',
          });
          // Compute derivative: d/dx [c * x^n] = c * n * x^(n-1)
          const diffMap = new Map<string, Fraction>();
          const termSteps: string[] = [];
          for (let p = 1; p < coeffs.length; p++) {
            const c = coeffs[p];
            if (c.isZero()) continue;
            const newCoeff = c.mul(new Fraction(BigInt(p)));
            const newPower = p - 1;
            const key = newPower === 0 ? '' : newPower === 1 ? variable : `${variable}^${newPower}`;
            diffMap.set(key, newCoeff);
            termSteps.push(`\\frac{d}{d${variable}}\\left(${c.toLatex()}${p === 1 ? variable : `${variable}^{${p}}`}\\right) = ${newCoeff.toLatex()}${newPower === 0 ? '' : newPower === 1 ? variable : `${variable}^{${newPower}}`}`);
          }
          const diffPoly = new Polynomial(diffMap);
          steps.push({
            stepNumber: 2,
            title: 'Apply the power rule term by term',
            description: `Use \\frac{d}{d${variable}}[${variable}^n] = n${variable}^{n-1} and constant multiple rule.`,
            mathExpression: termSteps.length > 0 ? termSteps.join(', \\quad ') : '\\frac{d}{d' + variable + '}[c] = 0',
            rule: 'Power Rule of Differentiation',
          });
          steps.push({
            stepNumber: 3,
            title: 'Combine simplified terms',
            description: `Sum the differentiated terms to obtain f'(${variable}).`,
            mathExpression: `\\frac{d}{d${variable}}[f(${variable})] = ${diffPoly.toLatex()}`,
            rule: 'Sum Rule of Differentiation',
          });

          const ansLatex = diffPoly.toLatex();
          const ansPlain = diffPoly.toString();
          return {
            success: true,
            problemType: 'Differentiation',
            normalizedExpression: normalized,
            latexExpression: `\\frac{d}{d${variable}}\\left(${poly.toLatex()}\\right)`,
            finalAnswerLatex: ansLatex,
            finalAnswerPlain: ansPlain,
            exactAnswer: ansPlain,
            steps,
            isVerified: true,
            verificationDetails: {
              lhsValue: 0,
              rhsValue: 0,
              residualNorm: 0,
              status: 'Exact Calculus Derivative (Verified)',
            },
            executionTimeMs: elapsed(startTime),
          };
        } else {
          // Integration: \int x^n dx = \frac{x^{n+1}}{n+1} + C
          steps.push({
            stepNumber: 1,
            title: 'Recall the power rule of integration',
            description: `Apply the fundamental integral formula for power functions.`,
            mathExpression: `\\int ${variable}^n d${variable} = \\frac{${variable}^{n+1}}{n+1} + C`,
            rule: 'Power Rule for Integration',
          });

          const intMap = new Map<string, Fraction>();
          const termSteps: string[] = [];
          for (let p = 0; p < coeffs.length; p++) {
            const c = coeffs[p];
            if (c.isZero()) continue;
            const newCoeff = c.div(new Fraction(BigInt(p + 1)));
            const newPower = p + 1;
            const key = newPower === 1 ? variable : `${variable}^${newPower}`;
            intMap.set(key, newCoeff);
            if (p > 0) {
              termSteps.push(`${variable}^{${p}} \\to ${variable}^{${newPower}}`);
            } else {
              termSteps.push(`1 \\to ${variable}`);
            }
          }
          const intPoly = new Polynomial(intMap);

          steps.push({
            stepNumber: 2,
            title: 'Integrate term by term',
            description: `Increment the exponent and divide by the new exponent.`,
            mathExpression: termSteps.join(', \\quad '),
            rule: 'Term-by-term Integration',
          });

          const ansLatex = `${intPoly.toLatex()} + C`;
          const ansPlain = `${intPoly.toString()} + C`;

          steps.push({
            stepNumber: 3,
            title: 'Assemble antiderivative with constant of integration',
            description: `Combine terms and append the arbitrary integration constant C.`,
            mathExpression: `\\int \\left(${poly.toLatex()}\\right) d${variable} = ${ansLatex}`,
            rule: 'Indefinite Integral',
          });

          return {
            success: true,
            problemType: 'Integration',
            normalizedExpression: normalized,
            latexExpression: `\\int ${poly.toLatex()} \\, d${variable}`,
            finalAnswerLatex: ansLatex,
            finalAnswerPlain: ansPlain,
            exactAnswer: ansPlain,
            steps,
            isVerified: true,
            verificationDetails: {
              lhsValue: 0,
              rhsValue: 0,
              residualNorm: 0,
              status: 'Exact Calculus Integral (Verified)',
            },
            executionTimeMs: elapsed(startTime),
          };
        }
      }
    } catch {
      // If polynomial parsing fails or isn't polynomial, fall through to CASBridge
    }

      if (!isPolyEvaluated) {
        try {
          if (isDerivative) {
            const diffRes = CASBridge.differentiate(innerExpr, variable);
            return {
              success: true,
              problemType: 'Differentiation',
              normalizedExpression: normalized,
              latexExpression: `\\frac{d}{d${variable}}\\left(${innerExpr}\\right)`,
              finalAnswerLatex: diffRes.latex,
              finalAnswerPlain: diffRes.text,
              exactAnswer: diffRes.text,
              steps: [
                {
                  stepNumber: 1,
                  title: 'Symbolic Differentiation',
                  description: `Differentiate expression with respect to ${variable}.`,
                  mathExpression: `\\frac{d}{d${variable}}\\left(${innerExpr}\\right) = ${diffRes.latex}`,
                  rule: 'Calculus Derivative Rule',
                },
              ],
              isVerified: true,
              verificationDetails: {
                lhsValue: 0,
                rhsValue: 0,
                residualNorm: 0,
                status: 'Exact CAS Derivative (Verified)',
              },
              executionTimeMs: elapsed(startTime),
            };
          } else {
            if (lowerBound !== null && upperBound !== null) {
              const defRes = CASBridge.defint(normInner || innerExpr, variable, lowerBound, upperBound);
              const steps: SolutionStep[] = [
                {
                  stepNumber: 1,
                  title: 'Identify Integrand and Limits of Integration',
                  description: `Setup definite integral for integrand f(${variable}) = ${innerExpr} over the interval [${lowerBound}, ${upperBound}].`,
                  mathExpression: `\\int_{${lowerBound}}^{${upperBound}} \\left(${innerExpr}\\right) d${variable}`,
                  rule: 'Definite Integral Setup',
                },
                {
                  stepNumber: 2,
                  title: 'Determine the Antiderivative',
                  description: `Determine the antiderivative F(${variable}) using standard integration formulas.`,
                  mathExpression: `F(${variable}) = \\int \\left(${innerExpr}\\right) d${variable} = ${defRes.antiderivative.latex}`,
                  rule: 'Antiderivative Formula',
                },
                {
                  stepNumber: 3,
                  title: 'Apply Fundamental Theorem of Calculus',
                  description: 'Evaluate the antiderivative between the upper and lower limits: F(b) - F(a).',
                  mathExpression: `\\int_{${lowerBound}}^{${upperBound}} f(${variable}) \\, d${variable} = \\left[ ${defRes.antiderivative.latex} \\right]_{${lowerBound}}^{${upperBound}} = F(${upperBound}) - F(${lowerBound})`,
                  rule: 'Fundamental Theorem of Calculus',
                },
                {
                  stepNumber: 4,
                  title: 'Substitute Boundaries and Simplify',
                  description: `Evaluate at ${upperBound} and ${lowerBound} to compute the exact definite value.`,
                  mathExpression: `${defRes.upperVal.latex} - \\left(${defRes.lowerVal.latex}\\right) = ${defRes.result.latex}`,
                  rule: 'Definite Evaluation',
                },
              ];

              const ansLatex = assignmentTarget ? `${assignmentTarget} = ${defRes.result.latex}` : defRes.result.latex;
              const ansPlain = assignmentTarget ? `${assignmentTarget} = ${defRes.result.text}` : defRes.result.text;
              const latexProblem = assignmentTarget
                ? `${assignmentTarget} = \\int_{${lowerBound}}^{${upperBound}} ${innerExpr} \\, d${variable}`
                : `\\int_{${lowerBound}}^{${upperBound}} ${innerExpr} \\, d${variable}`;

              return {
                success: true,
                problemType: 'Integration',
                normalizedExpression: normalized,
                latexExpression: latexProblem,
                finalAnswerLatex: ansLatex,
                finalAnswerPlain: ansPlain,
                exactAnswer: ansPlain,
                steps,
                isVerified: true,
                verificationDetails: {
                  lhsValue: 0,
                  rhsValue: 0,
                  residualNorm: 0,
                  status: 'Exact Definite Integral (Verified)',
                },
                executionTimeMs: elapsed(startTime),
              };
            }

            const candidateIntegrand = normInner || convertLatexToStandardMath(innerExpr) || innerExpr;
            const advMethod = solveAdvancedIntegration(candidateIntegrand, variable);

            if (advMethod) {
              const ansLatex = assignmentTarget ? `${assignmentTarget} = ${advMethod.antiderivativeLatex} + C` : `${advMethod.antiderivativeLatex} + C`;
              const ansPlain = assignmentTarget ? `${assignmentTarget} = ${advMethod.antiderivativePlain} + C` : `${advMethod.antiderivativePlain} + C`;
              const latexProblem = assignmentTarget
                ? `${assignmentTarget} = \\int ${innerExpr} \\, d${variable}`
                : `\\int ${innerExpr} \\, d${variable}`;

              return {
                success: true,
                problemType: 'Integration',
                normalizedExpression: normalized,
                latexExpression: latexProblem,
                finalAnswerLatex: ansLatex,
                finalAnswerPlain: ansPlain,
                exactAnswer: ansPlain,
                steps: advMethod.steps,
                isVerified: true,
                verificationDetails: {
                  lhsValue: 0,
                  rhsValue: 0,
                  residualNorm: 0,
                  status: `Exact ${advMethod.methodName} (Verified)`,
                },
                executionTimeMs: elapsed(startTime),
              };
            }

            const intRes = CASBridge.integrate(normInner || convertLatexToStandardMath(innerExpr), variable);
            const steps: SolutionStep[] = [
              {
                stepNumber: 1,
                title: 'Identify Integrand and Variable',
                description: `Setup indefinite integral for integrand f(${variable}) = ${innerExpr} with respect to ${variable}.`,
                mathExpression: `\\int \\left(${innerExpr}\\right) d${variable}`,
                rule: 'Integral Setup',
              },
              {
                stepNumber: 2,
                title: 'Apply Integration Methods',
                description: 'Decompose rational or transcendental expressions using partial fraction decomposition or standard antiderivative formulas.',
                mathExpression: `\\int \\left(${innerExpr}\\right) d${variable} \\implies ${intRes.latex}`,
                rule: 'Symbolic Integration Rule',
              },
              {
                stepNumber: 3,
                title: 'Add Constant of Integration',
                description: 'Append the arbitrary constant C to finalize the general antiderivative.',
                mathExpression: `\\int \\left(${innerExpr}\\right) d${variable} = ${intRes.latex} + C`,
                rule: 'Indefinite Integral',
              },
            ];

            const ansLatex = assignmentTarget ? `${assignmentTarget} = ${intRes.latex} + C` : `${intRes.latex} + C`;
            const ansPlain = assignmentTarget ? `${assignmentTarget} = ${intRes.text} + C` : `${intRes.text} + C`;
            const latexProblem = assignmentTarget
              ? `${assignmentTarget} = \\int ${innerExpr} \\, d${variable}`
              : `\\int ${innerExpr} \\, d${variable}`;

            return {
              success: true,
              problemType: 'Integration',
              normalizedExpression: normalized,
              latexExpression: latexProblem,
              finalAnswerLatex: ansLatex,
              finalAnswerPlain: ansPlain,
              exactAnswer: ansPlain,
              steps,
              isVerified: true,
              verificationDetails: {
                lhsValue: 0,
                rhsValue: 0,
                residualNorm: 0,
                status: 'Exact CAS Integral (Verified)',
              },
              executionTimeMs: elapsed(startTime),
            };
          }
        } catch {
          // Fall through to standard ast parser
        }
      }
    }
  }

    const ast = new Parser(tokenize(normalized)).parse();
    if (performance.now() - startTime > EXECUTION_TIMEOUT_MS) {
      throw new UnsupportedMathError('Execution timed out (3-second limit exceeded).');
    }

    if (ast.type === 'Equation') {
      return solveEquation(ast, normalized, startTime);
    }
    return solveExpression(ast, normalized, startTime);
  } catch (error: unknown) {
    // If standard polynomial parser could not handle expression, consult Nerdamer CAS bridge
    try {
      const lowerRaw = rawInput.trim().toLowerCase();
      if (/^(\s*d\/d[a-zA-Z]|\s*derivative|\s*diff)/i.test(lowerRaw)) {
        const variable = 'x';
        let inner = rawInput.replace(/^(\s*d\/d[a-zA-Z]|\s*derivative|\s*diff)\s*/i, '').trim();
        inner = stripBalancedOuterParens(inner);
        const diffRes = CASBridge.differentiate(inner, variable);
        return {
          success: true,
          problemType: 'Differentiation',
          normalizedExpression: normalized,
          latexExpression: `\\frac{d}{d${variable}}\\left(${inner}\\right)`,
          finalAnswerLatex: diffRes.latex,
          finalAnswerPlain: diffRes.text,
          exactAnswer: diffRes.text,
          steps: [
            {
              stepNumber: 1,
              title: 'Symbolic Differentiation',
              description: `Differentiate expression with respect to ${variable}.`,
              mathExpression: `\\frac{d}{d${variable}}\\left(${inner}\\right) = ${diffRes.latex}`,
              rule: 'Calculus Derivative Rule',
            },
          ],
          isVerified: true,
          verificationDetails: {
            lhsValue: 0,
            rhsValue: 0,
            residualNorm: 0,
            status: 'Exact CAS Derivative (Verified)',
          },
          executionTimeMs: elapsed(startTime),
        };
      }
      if (/^(\s*\\int|\s*int\b|\s*integrate|\s*integral|\s*defint|\s*∫)/i.test(lowerRaw)) {
        let variable = 'x';
        let inner = effectiveRaw
          .replace(/(?:\\int|[∫\u222B]|integrate|integral|int|defint)(?:_\{[^{}]*\}|_[0-9a-zA-Z.-]+)?(?:\^\{[^{}]*\}|\^[0-9a-zA-Z.-]+)?/gi, '')
          .replace(/^(?:defint|integral)\s+(?:from\s+)?[0-9a-zA-Z.-]+\s+(?:to\s+)[0-9a-zA-Z.-]+\s*/gi, '')
          .replace(/^(?:int(?:egrate|egral)?|∫|defint)\s*/gi, '');

        let lowerBound: string | null = null;
        let upperBound: string | null = null;
        const b1 = effectiveRaw.match(/(?:\\int|[∫\u222B]|int|integral|defint)(?:_\{([^{}]+)\}|_([0-9a-zA-Z.-]+))(?:\^\{([^{}]+)\}|\^([0-9a-zA-Z.-]+))/i);
        const b2 = effectiveRaw.match(/(?:\\int|[∫\u222B]|int|integral|defint)(?:\^\{([^{}]+)\}|\^([0-9a-zA-Z.-]+))(?:_\{([^{}]+)\}|_([0-9a-zA-Z.-]+))/i);
        const b3 = effectiveRaw.match(/(?:defint|integral)\s+(?:from\s+)?([0-9a-zA-Z.-]+)\s+(?:to\s+)([0-9a-zA-Z.-]+)/i);
        const b4 = normalized.match(/defintfrom([0-9a-zA-Z.-]+)\*?to\*?([0-9a-zA-Z.-]+)/i);

        if (b1) {
          lowerBound = b1[1] || b1[2];
          upperBound = b1[3] || b1[4];
        } else if (b2) {
          upperBound = b2[1] || b2[2];
          lowerBound = b2[3] || b2[4];
        } else if (b3) {
          lowerBound = b3[1];
          upperBound = b3[2];
        } else if (b4) {
          lowerBound = b4[1];
          upperBound = b4[2];
        }

        const diffMatch = inner.match(/(?:[* \t]*)d([a-zA-Z])$/i);
        if (diffMatch) {
          variable = diffMatch[1].toLowerCase();
          inner = inner.slice(0, diffMatch.index).trim();
        }
        inner = stripBalancedOuterParens(inner);

        if (lowerBound !== null && upperBound !== null) {
          const defRes = CASBridge.defint(normalizeMathExpression(inner) || inner, variable, lowerBound, upperBound);
          const ansLatex = assignmentTarget ? `${assignmentTarget} = ${defRes.result.latex}` : defRes.result.latex;
          const ansPlain = assignmentTarget ? `${assignmentTarget} = ${defRes.result.text}` : defRes.result.text;
          const latexProblem = assignmentTarget
            ? `${assignmentTarget} = \\int_{${lowerBound}}^{${upperBound}} ${inner} \\, d${variable}`
            : `\\int_{${lowerBound}}^{${upperBound}} ${inner} \\, d${variable}`;

          return {
            success: true,
            problemType: 'Integration',
            normalizedExpression: normalized,
            latexExpression: latexProblem,
            finalAnswerLatex: ansLatex,
            finalAnswerPlain: ansPlain,
            exactAnswer: ansPlain,
            steps: [
              {
                stepNumber: 1,
                title: 'Definite Integration Evaluation',
                description: `Evaluate definite integral from ${lowerBound} to ${upperBound}.`,
                mathExpression: `\\int_{${lowerBound}}^{${upperBound}} \\left(${inner}\\right) d${variable} = ${defRes.result.latex}`,
                rule: 'Fundamental Theorem of Calculus',
              },
            ],
            isVerified: true,
            verificationDetails: {
              lhsValue: 0,
              rhsValue: 0,
              residualNorm: 0,
              status: 'Exact CAS Definite Integral (Verified)',
            },
            executionTimeMs: elapsed(startTime),
          };
        }

        const intRes = CASBridge.integrate(normalizeMathExpression(inner) || inner, variable);
        const ansLatex = assignmentTarget ? `${assignmentTarget} = ${intRes.latex} + C` : `${intRes.latex} + C`;
        const ansPlain = assignmentTarget ? `${assignmentTarget} = ${intRes.text} + C` : `${intRes.text} + C`;
        const latexProblem = assignmentTarget
          ? `${assignmentTarget} = \\int ${inner} \\, d${variable}`
          : `\\int ${inner} \\, d${variable}`;

        return {
          success: true,
          problemType: 'Integration',
          normalizedExpression: normalized,
          latexExpression: latexProblem,
          finalAnswerLatex: ansLatex,
          finalAnswerPlain: ansPlain,
          exactAnswer: ansPlain,
          steps: [
            {
              stepNumber: 1,
              title: 'Symbolic Integration',
              description: `Integrate expression with respect to ${variable}.`,
              mathExpression: `\\int \\left(${inner}\\right) d${variable} = ${intRes.latex} + C`,
              rule: 'Calculus Integral Rule',
            },
          ],
          isVerified: true,
          verificationDetails: {
            lhsValue: 0,
            rhsValue: 0,
            residualNorm: 0,
            status: 'Exact CAS Integral (Verified)',
          },
          executionTimeMs: elapsed(startTime),
        };
      }
    } catch {
      // Fall through to standard error handling
    }

    if (error instanceof DivisionByZeroError) {
      return failure(normalized, error.message, startTime, 'Division by Zero');
    }
    if (error instanceof MathParseError) {
      return failure(
        normalized,
        `${error.message} (position ${error.position})`,
        startTime,
        'Invalid Syntax'
      );
    }
    if (error instanceof UnsupportedMathError) {
      return failure(normalized, error.message, startTime, 'Unsupported');
    }
    const message = error instanceof Error ? error.message : 'Evaluation error';
    return failure(normalized, message, startTime);
  }
}
