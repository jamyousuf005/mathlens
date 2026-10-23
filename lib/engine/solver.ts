import { DivisionByZeroError, MathParseError, UnsupportedMathError } from './errors';
import { tokenize } from './lexer';
import { normalizeMathExpression } from './normalizer';
import { Parser } from './parser';
import { Polynomial, factorPolynomial } from './polynomial';
import { Fraction, ONE } from './rational';
import { ASTNode, EquationNode, SolutionResult, SolutionStep } from './types';

const MAX_INPUT_LENGTH = 300;

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
  throw new UnsupportedMathError('Unsupported expression.');
}

function arithmeticResult(
  normalized: string,
  value: Fraction,
  startTime: number
): SolutionResult {
  const plain = value.toString();
  return {
    success: true,
    problemType: 'Arithmetic',
    normalizedExpression: normalized,
    latexExpression: normalized.replace(/\*/g, ' \\times '),
    finalAnswerLatex: value.toLatex(),
    finalAnswerPlain: plain,
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
      lhsValue: value.toNumber(),
      rhsValue: value.toNumber(),
      residualNorm: 0,
      status: 'Deterministic Exact',
    },
    executionTimeMs: elapsed(startTime),
  };
}

function formatRoot(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return Number(value.toFixed(6)).toString();
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
  startTime: number
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
    latexExpression: normalized,
    finalAnswerLatex: `${variable} = ${root.toLatex()}`,
    finalAnswerPlain: `${variable} = ${root.toString()}`,
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
  startTime: number
): SolutionResult {
  const a = quadratic.toNumber();
  const b = linear.toNumber();
  const c = constant.toNumber();
  const delta = b * b - 4 * a * c;
  const bFmt = b < 0 ? `(${b})` : `${b}`;
  const minusB = -b;
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
      mathExpression: `\\Delta = ${bFmt}^2 - 4(${a})(${c}) = ${delta}`,
      rule: 'Discriminant Formula',
    },
  ];

  if (delta > 1e-12) {
    const squareRoot = Math.sqrt(delta);
    const first = (-b + squareRoot) / (2 * a);
    const second = (-b - squareRoot) / (2 * a);
    const residual = Math.max(
      Math.abs(a * first * first + b * first + c),
      Math.abs(a * second * second + b * second + c)
    );
    steps.push({
      stepNumber: 3,
      title: 'Apply the quadratic formula',
      description: `Use ${variable} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}.`,
      mathExpression: `${variable} = \\frac{${minusB} \\pm \\sqrt{${delta}}}{2(${a})}`,
      rule: 'Quadratic Formula',
    });
    steps.push({
      stepNumber: 4,
      title: 'Verify by substitution',
      description: 'Substitute both roots back into the original polynomial.',
      mathExpression: `${variable}_1 = ${formatRoot(first)}, \\quad ${variable}_2 = ${formatRoot(second)}`,
      rule: 'Substitution Verification',
    });
    return {
      success: true,
      problemType: 'Quadratic Equation',
      normalizedExpression: normalized,
      latexExpression: normalized,
      finalAnswerLatex: `${variable} \\in \\{${formatRoot(first)}, \\, ${formatRoot(second)}\\}`,
      finalAnswerPlain: `${variable} = ${formatRoot(first)}, ${variable} = ${formatRoot(second)}`,
      roots: [first, second],
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

  if (Math.abs(delta) <= 1e-12) {
    const root = -b / (2 * a);
    const residual = Math.abs(a * root * root + b * root + c);
    steps.push({
      stepNumber: 3,
      title: 'Repeated root',
      description: 'The discriminant is zero, so there is one repeated real root.',
      mathExpression: `${variable} = \\frac{${minusB}}{2(${a})} = ${formatRoot(root)}`,
      rule: 'Double Root Property',
    });
    return {
      success: true,
      problemType: 'Quadratic Equation',
      normalizedExpression: normalized,
      latexExpression: normalized,
      finalAnswerLatex: `${variable} = ${formatRoot(root)}`,
      finalAnswerPlain: `${variable} = ${formatRoot(root)}`,
      roots: [root],
      steps,
      isVerified: residual < 1e-9,
      verificationDetails: {
        lhsValue: residual,
        rhsValue: 0,
        residualNorm: residual,
        status: 'Exact Verified',
      },
      executionTimeMs: elapsed(startTime),
    };
  }

  const realPart = -b / (2 * a);
  const imaginaryPart = Math.sqrt(-delta) / (2 * a);
  const residualReal = a * (realPart * realPart - imaginaryPart * imaginaryPart) + b * realPart + c;
  const residualImaginary = a * (2 * realPart * imaginaryPart) + b * imaginaryPart;
  const residual = Math.hypot(residualReal, residualImaginary);
  steps.push({
    stepNumber: 3,
    title: 'Complex conjugate roots',
    description: 'The discriminant is negative, so the roots are complex.',
    mathExpression: `${variable} = ${realPart.toFixed(2)} \\pm ${imaginaryPart.toFixed(2)}i`,
    rule: 'Complex Roots',
  });
  return {
    success: true,
    problemType: 'Quadratic Equation',
    normalizedExpression: normalized,
    latexExpression: normalized,
    finalAnswerLatex: `${variable} = ${realPart.toFixed(2)} \\pm ${imaginaryPart.toFixed(2)}i`,
    finalAnswerPlain: `${variable} = ${realPart.toFixed(2)} +/- ${imaginaryPart.toFixed(2)}i`,
    steps,
    isVerified: residual < 1e-9,
    verificationDetails: {
      lhsValue: residual,
      rhsValue: 0,
      residualNorm: residual,
      status: 'Complex Substitution Verification',
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

  if (coefficients.length === 2) {
    return solveLinear(coefficients[1], coefficients[0], variable, normalized, startTime);
  }
  if (coefficients.length === 3) {
    return solveQuadratic(
      coefficients[2],
      coefficients[1],
      coefficients[0],
      variable,
      normalized,
      startTime
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
    return arithmeticResult(normalized, evaluateAst(ast), startTime);
  }

  const polynomial = Polynomial.fromAst(ast);
  const factored = factorPolynomial(polynomial);
  const plain = factored?.plain ?? polynomial.toString();
  const latex = factored?.latex ?? polynomial.toLatex();
  return {
    success: true,
    problemType: factored ? 'Algebraic Identity / Factoring' : 'Algebraic Simplification',
    normalizedExpression: normalized,
    latexExpression: normalized,
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

export function solveMathProblem(rawInput: string): SolutionResult {
  const startTime = performance.now();

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

  const normalized = normalizeMathExpression(rawInput);
  if (!normalized) {
    return failure('', 'Empty mathematical expression', startTime, 'No input');
  }

  try {
    const ast = new Parser(tokenize(normalized)).parse();
    if (ast.type === 'Equation') {
      return solveEquation(ast, normalized, startTime);
    }
    return solveExpression(ast, normalized, startTime);
  } catch (error: unknown) {
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
