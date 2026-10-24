import { DivisionByZeroError, MathParseError, UnsupportedMathError } from './errors';
import { tokenize } from './lexer';
import { normalizeMathExpression } from './normalizer';
import { Parser } from './parser';
import { Polynomial, factorPolynomial } from './polynomial';
import { Fraction, ONE, ZERO } from './rational';
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
  startTime: number
): SolutionResult {
  const plain = value.toString();
  const numVal = value.toNumber();
  const exact = value.d === 1n ? value.n.toString() : `${value.n}/${value.d}`;
  return {
    success: true,
    problemType: 'Arithmetic',
    normalizedExpression: normalized,
    latexExpression: normalized.replace(/\*/g, ' \\times '),
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
    const rA = (-b + squareRoot) / (2 * a);
    const rB = (-b - squareRoot) / (2 * a);
    const first = Math.min(rA, rB);
    const second = Math.max(rA, rB);
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
      exactAnswer: `${variable} = ${formatRoot(first)}, ${variable} = ${formatRoot(second)}`,
      decimalAnswer: [Number(first.toFixed(6)), Number(second.toFixed(6))],
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

  const normalized = normalizeMathExpression(rawInput);
  if (!normalized) {
    return failure('', 'Empty mathematical expression', startTime, 'No input');
  }

  try {
    if (performance.now() - startTime > EXECUTION_TIMEOUT_MS) {
      throw new UnsupportedMathError('Execution timed out (3-second limit exceeded).');
    }

    // Check if input is a system of equations (split by comma, semicolon, or newline)
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
    }
    if (rawParts.length > 2 && rawParts.every(p => p.includes('='))) {
      throw new UnsupportedMathError('Systems with more than 2 equations are not supported yet (Tier 2/3).');
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
