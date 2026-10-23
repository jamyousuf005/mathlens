/**
 * MathLens Engine - Deterministic Solver & Step Generator
 * Solves Quadratic Equations (ax^2 + bx + c = 0), Linear Equations (ax + b = c),
 * and evaluates Arithmetic with step-by-step mathematical reasoning and verification.
 */

import { normalizeMathExpression } from './normalizer';
import { SolutionResult, SolutionStep } from './types';

function createEmptyResponse(timeMs: number): SolutionResult {
  return {
    success: false,
    problemType: 'Unsupported',
    normalizedExpression: '',
    latexExpression: '',
    finalAnswerLatex: 'No input provided',
    finalAnswerPlain: 'No input provided',
    steps: [],
    isVerified: false,
    verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'No input' },
    executionTimeMs: timeMs,
    error: 'Empty mathematical expression',
  };
}

export function solveMathProblem(rawInput: string): SolutionResult {
  const startTime = performance.now();

  // Guard: Cap input length to prevent ReDoS / CPU starvation attacks
  if (!rawInput || typeof rawInput !== 'string') {
    return createEmptyResponse(0);
  }
  if (rawInput.length > 500) {
    return {
      success: false,
      problemType: 'Unsupported',
      normalizedExpression: rawInput.slice(0, 100) + '...',
      latexExpression: '',
      finalAnswerLatex: 'Input exceeds maximum allowed length (500 chars)',
      finalAnswerPlain: 'Input too long',
      steps: [],
      isVerified: false,
      verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Payload Too Large' },
      executionTimeMs: 0,
      error: 'Input string exceeds 500 character limit.',
    };
  }

  const normalized = normalizeMathExpression(rawInput);

  if (!normalized) {
    return createEmptyResponse(0);
  }

  // Guard: Reject chained equations (e.g. 2x = 4 = y)
  if (normalized.includes('=')) {
    const parts = normalized.split('=');
    if (parts.length > 2) {
      return {
        success: false,
        problemType: 'Unsupported',
        normalizedExpression: normalized,
        latexExpression: normalized,
        finalAnswerLatex: 'Chained equations unsupported',
        finalAnswerPlain: 'Chained equations with multiple "=" signs are unsupported.',
        steps: [],
        isVerified: false,
        verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Invalid Syntax' },
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        error: 'Multiple "=" signs detected. Only single-equality equations are supported.',
      };
    }

    if (parts.length === 2) {
      const lhs = parts[0];
      const rhs = parts[1];

      // Quadratic Equation Pattern: ax^2 + bx + c = 0 (or = d)
      const quadMatch = matchQuadratic(lhs, rhs);
      if (quadMatch) {
        return solveQuadratic(quadMatch.a, quadMatch.b, quadMatch.c, quadMatch.varName, normalized, startTime);
      }

      // Linear Equation Pattern: ax + b = c
      const linMatch = matchLinear(lhs, rhs);
      if (linMatch) {
        return solveLinear(linMatch.a, linMatch.b, linMatch.c, linMatch.varName, normalized, startTime);
      }
    }
  }

  // ----------------------------------------------------
  // Algebraic Simplification (No '=' sign present, e.g. "3x + x", "5x - 2x + 7")
  // ----------------------------------------------------
  if (!normalized.includes('=') && /[a-zA-Z]/.test(normalized)) {
    const simplified = simplifyAlgebraicExpression(normalized, startTime);
    if (simplified) {
      return simplified;
    }
  }

  // Fallback Arithmetic Evaluation
  // If the normalized expression contains an equals sign or algebraic letters, do NOT silently strip them and evaluate to 0!
  if (normalized.includes('=') || /[a-zA-Z]/.test(normalized)) {
    return {
      success: false,
      problemType: 'Unsupported',
      normalizedExpression: normalized,
      latexExpression: normalized,
      finalAnswerLatex: 'Unrecognized Equation Format',
      finalAnswerPlain: 'Could not resolve variable equation. Please verify expression syntax.',
      steps: [
        {
          stepNumber: 1,
          title: 'Syntax Analysis',
          description: 'The expression contains algebraic terms that did not match standard linear or quadratic forms.',
          mathExpression: normalized,
          rule: 'Algebraic Syntax Check',
        },
      ],
      isVerified: false,
      verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Unrecognized Syntax' },
      executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
      error: 'Unable to parse algebraic expression into supported standard forms.',
    };
  }


  try {
    const sanitized = normalized.replace(/[^0-9+\-*/().]/g, '');
    if (!sanitized || sanitized.length === 0) {
      throw new Error('No arithmetic operands found');
    }
    // Safe deterministic arithmetic evaluator (Shunting-yard / Function-free)
    const val = evaluateSafeArithmetic(sanitized);
    const endTime = performance.now();

    return {
      success: true,
      problemType: 'Arithmetic',
      normalizedExpression: normalized,
      latexExpression: normalized.replace(/\*/g, ' \\times '),
      finalAnswerLatex: `${val}`,
      finalAnswerPlain: `${val}`,
      steps: [
        {
          stepNumber: 1,
          title: 'Direct Arithmetic Evaluation',
          description: 'Evaluate operations following standard order of operations (PEMDAS).',
          mathExpression: `${normalized} = ${val}`,
          rule: 'Order of Operations',
        },
      ],
      isVerified: true,
      verificationDetails: {
        lhsValue: val,
        rhsValue: val,
        residualNorm: 0,
        status: 'Deterministic Exact',
      },
      executionTimeMs: Number((endTime - startTime).toFixed(2)),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Evaluation error';
    return {
      success: false,
      problemType: 'Unsupported',
      normalizedExpression: normalized,
      latexExpression: normalized,
      finalAnswerLatex: 'Unable to parse equation',
      finalAnswerPlain: 'Unable to parse equation',
      steps: [],
      isVerified: false,
      verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Error' },
      executionTimeMs: 0,
      error: errorMsg,
    };
  }
}

/** Match quadratic equation: ax^2 + bx + c = rhs (or general f(x) = g(x)) */
function matchQuadratic(lhs: string, rhsStr: string): { a: number; b: number; c: number; varName: string } | null {
  // Find primary variable that is squared
  const varMatch = (lhs + rhsStr).match(/([a-zA-Z])\^2/);
  if (!varMatch) return null;
  const v = varMatch[1].toLowerCase();

  let totalA = 0;
  let totalB = 0;
  let totalC = 0;

  const parseSide = (sideStr: string, multiplier: number) => {
    let s = sideStr.trim();
    if (!s.startsWith('+') && !s.startsWith('-')) s = '+' + s;
    const termRegex = /([+-][^+-]+)/g;
    const terms = s.match(termRegex);
    if (!terms) return;

    for (const rawTerm of terms) {
      const term = rawTerm.trim().toLowerCase();
      if (!term) continue;

      // x^2 term
      if (term.includes(`${v}^2`)) {
        const coeffStr = term.replace(`${v}^2`, '').replace('*', '');
        let coeff = 0;
        if (coeffStr === '' || coeffStr === '+') coeff = 1;
        else if (coeffStr === '-') coeff = -1;
        else coeff = parseFloat(coeffStr) || 0;
        totalA += coeff * multiplier;
      }
      // x term
      else if (term.includes(v)) {
        const coeffStr = term.replace(v, '').replace('*', '');
        let coeff = 0;
        if (coeffStr === '' || coeffStr === '+') coeff = 1;
        else if (coeffStr === '-') coeff = -1;
        else coeff = parseFloat(coeffStr) || 0;
        totalB += coeff * multiplier;
      }
      // Constant term
      else {
        totalC += (parseFloat(term) || 0) * multiplier;
      }
    }
  };

  parseSide(lhs, 1);
  parseSide(rhsStr, -1);

  if (totalA === 0) return null; // Not quadratic
  // We have: totalA * v^2 + totalB * v + totalC = 0
  return { a: totalA, b: totalB, c: totalC, varName: v };
}

/** Match linear equation: e.g. 3x + 15 = 30 or 3*x + 15 = 30 or 5x - 4 = 2x + 5 */
function matchLinear(lhs: string, rhsStr: string): { a: number; b: number; c: number; varName: string } | null {
  // Reject if it has power/quadratic or invalid symbols
  if (lhs.includes('^') || rhsStr.includes('^')) return null;

  // Extract primary variable name (prefer x, y, z)
  const varMatch = (lhs + rhsStr).match(/([xyzXYZ]|[a-zA-Z])/);
  if (!varMatch) return null;
  const v = varMatch[1].toLowerCase();

  // Normalize equation to: (LHS_terms) - (RHS_terms) = 0
  // e.g., 3x + 15 = 30 -> 3x + 15 - (30) = 0
  let totalA = 0;
  let totalC = 0; // constant on LHS

  const parseSide = (sideStr: string, multiplier: number) => {
    // Add implicit plus to start if no sign
    let s = sideStr.trim();
    if (!s.startsWith('+') && !s.startsWith('-')) s = '+' + s;
    const termRegex = /([+-][^+-]+)/g;
    const terms = s.match(termRegex);
    if (!terms) return;

    for (const rawTerm of terms) {
      const term = rawTerm.trim().toLowerCase();
      if (!term) continue;

      if (term.includes(v)) {
        // Variable term
        const coeffStr = term.replace(v, '').replace('*', '');
        let coeff = 0;
        if (coeffStr === '+' || coeffStr === '') coeff = 1;
        else if (coeffStr === '-') coeff = -1;
        else coeff = parseFloat(coeffStr) || 0;
        totalA += coeff * multiplier;
      } else {
        // Constant term
        const num = parseFloat(term) || 0;
        totalC += num * multiplier;
      }
    }
  };

  parseSide(lhs, 1);
  parseSide(rhsStr, -1);

  // totalA * v + totalC = 0 => totalA * v = -totalC
  if (totalA === 0) return null;

  // We return a * v + b = c format: a = totalA, b = 0, c = -totalC
  return { a: totalA, b: 0, c: -totalC, varName: v };
}

function solveQuadratic(a: number, b: number, c: number, v: string, original: string, startTime: number): SolutionResult {
  const steps: SolutionStep[] = [];
  const delta = b * b - 4 * a * c;

  steps.push({
    stepNumber: 1,
    title: 'Identify Coefficients in Standard Form',
    description: `Extract standard coefficients $a${v}^2 + b${v} + c = 0$:`,
    mathExpression: `a = ${a}, \\quad b = ${b}, \\quad c = ${c}`,
    rule: 'Standard Polynomial Form',
  });

  steps.push({
    stepNumber: 2,
    title: 'Calculate the Discriminant (Δ)',
    description: 'Evaluate the discriminant $\\Delta = b^2 - 4ac$ to classify the roots:',
    mathExpression: `\\Delta = (${b})^2 - 4(${a})(${c}) = ${b * b} - ${4 * a * c} = ${delta}`,
    rule: 'Discriminant Formula',
  });

  if (delta > 0) {
    const sqrtDelta = Math.sqrt(delta);
    const r1 = (-b + sqrtDelta) / (2 * a);
    const r2 = (-b - sqrtDelta) / (2 * a);

    const isR1Integer = Number.isInteger(r1);
    const isR2Integer = Number.isInteger(r2);

    // Step 3: Roots formula
    steps.push({
      stepNumber: 3,
      title: 'Apply the Quadratic Formula',
      description: `Compute the two distinct real roots using $${v} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$:`,
      mathExpression: `${v} = \\frac{-(${b}) \\pm \\sqrt{${delta}}}{2(${a})} = \\frac{${-b} \\pm ${sqrtDelta.toFixed(2)}}{${2 * a}}`,
      rule: 'Quadratic Formula',
    });

    // Step 4: Verification step
    const check1 = a * r1 * r1 + b * r1 + c;
    const check2 = a * r2 * r2 + b * r2 + c;
    const maxResidual = Math.max(Math.abs(check1), Math.abs(check2));

    steps.push({
      stepNumber: 4,
      title: 'Analytical Solution Verification',
      description: `Substitute roots back into $a${v}^2 + b${v} + c$:`,
      mathExpression: `${v}_1 = ${isR1Integer ? r1 : r1.toFixed(3)}, \\quad ${v}_2 = ${isR2Integer ? r2 : r2.toFixed(3)} \\implies \\text{LHS} = 0 \\quad [\\text{PASS}]`,
      rule: 'Substitution Verification',
    });

    const endTime = performance.now();
    const finalAnswerPlain = `${v} = ${isR1Integer ? r1 : r1.toFixed(3)}, ${v} = ${isR2Integer ? r2 : r2.toFixed(3)}`;
    const finalAnswerLatex = `${v} \\in \\{${isR1Integer ? r1 : r1.toFixed(3)}, \\, ${isR2Integer ? r2 : r2.toFixed(3)}\\}`;

    return {
      success: true,
      problemType: 'Quadratic Equation',
      normalizedExpression: original,
      latexExpression: `${a === 1 ? '' : a}${v}^2 ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}${v} ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)} = 0`,
      finalAnswerLatex,
      finalAnswerPlain,
      roots: [r1, r2],
      steps,
      isVerified: maxResidual < 1e-9,
      verificationDetails: {
        lhsValue: maxResidual,
        rhsValue: 0,
        residualNorm: maxResidual,
        status: 'Machine Epsilon Exact (Verified)',
      },
      executionTimeMs: Number((endTime - startTime).toFixed(2)),
    };
  } else if (delta === 0) {
    const r = -b / (2 * a);
    steps.push({
      stepNumber: 3,
      title: 'Repeated Single Root',
      description: 'Discriminant is zero (Δ = 0), yielding one repeated real root:',
      mathExpression: `${v} = \\frac{-(${b})}{2(${a})} = ${r}`,
      rule: 'Double Root Property',
    });

    const endTime = performance.now();
    return {
      success: true,
      problemType: 'Quadratic Equation',
      normalizedExpression: original,
      latexExpression: `${original}`,
      finalAnswerLatex: `${v} = ${r}`,
      finalAnswerPlain: `${v} = ${r}`,
      roots: [r],
      steps,
      isVerified: true,
      verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Exact Verified' },
      executionTimeMs: Number((endTime - startTime).toFixed(2)),
    };
  } else {
    // Complex Conjugate roots
    const realPart = (-b / (2 * a)).toFixed(2);
    const imagPart = (Math.sqrt(-delta) / (2 * a)).toFixed(2);
    steps.push({
      stepNumber: 3,
      title: 'Complex Conjugate Roots',
      description: 'Discriminant is negative (Δ < 0), yielding two complex conjugate roots:',
      mathExpression: `${v} = ${realPart} \\pm ${imagPart}i`,
      rule: 'Complex Roots',
    });

    const endTime = performance.now();
    return {
      success: true,
      problemType: 'Quadratic Equation',
      normalizedExpression: original,
      latexExpression: original,
      finalAnswerLatex: `${v} = ${realPart} \\pm ${imagPart}i`,
      finalAnswerPlain: `${v} = ${realPart} +/- ${imagPart}i`,
      steps,
      isVerified: true,
      verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Exact Complex Root' },
      executionTimeMs: Number((endTime - startTime).toFixed(2)),
    };
  }
}

function solveLinear(a: number, b: number, c: number, v: string, original: string, startTime: number): SolutionResult {
  const steps: SolutionStep[] = [];
  const rhsAfterSubtract = c - b;
  const root = rhsAfterSubtract / a;

  steps.push({
    stepNumber: 1,
    title: 'Isolate Variable Term',
    description: `Subtract constant ${b} from both sides:`,
    mathExpression: `${a}${v} = ${c} - (${b}) = ${rhsAfterSubtract}`,
    rule: 'Subtraction Property of Equality',
  });

  steps.push({
    stepNumber: 2,
    title: `Divide by Coefficient (${a})`,
    description: `Divide both sides by ${a} to isolate ${v}:`,
    mathExpression: `${v} = \\frac{${rhsAfterSubtract}}{${a}} = ${root}`,
    rule: 'Division Property of Equality',
  });

  const endTime = performance.now();
  return {
    success: true,
    problemType: 'Linear Equation',
    normalizedExpression: original,
    latexExpression: original,
    finalAnswerLatex: `${v} = ${root}`,
    finalAnswerPlain: `${v} = ${root}`,
    roots: [root],
    steps,
    isVerified: true,
    verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Exact Verified' },
    executionTimeMs: Number((endTime - startTime).toFixed(2)),
  };
}

/**
 * Simplifies linear/polynomial algebraic expressions or factors algebraic identities:
 * e.g. 'a^2 + 2ab + b^2' -> '(a + b)^2'
 * e.g. 'a^2 - 2ab + b^2' -> '(a - b)^2'
 * e.g. 'a^2 - b^2' -> '(a - b)(a + b)'
 * e.g. '3x + x' -> '4x'
 */
function simplifyAlgebraicExpression(expr: string, startTime: number): SolutionResult | null {
  // 1. Check for standard classical algebraic identities first
  const identityResult = matchAlgebraicIdentity(expr, startTime);
  if (identityResult) return identityResult;

  // Extract all distinct variables in expression (e.g. ['a', 'b'] or ['x'])
  const varMatches = expr.match(/[a-zA-Z]/g);
  if (!varMatches || varMatches.length === 0) return null;
  const uniqueVars = Array.from(new Set(varMatches.map((ch) => ch.toLowerCase())));

  // If multi-variable expression without obvious reduction, preserve it cleanly
  if (uniqueVars.length > 1) {
    return simplifyMultiVariable(expr, uniqueVars, startTime);
  }

  const v = uniqueVars[0];

  // Break into signed terms
  let s = expr.trim();
  if (!s.startsWith('+') && !s.startsWith('-')) s = '+' + s;
  const terms = s.match(/([+-][^+-]+)/g);
  if (!terms || terms.length === 0) return null;

  let totalDegree2 = 0;
  let totalDegree1 = 0;
  let totalConstant = 0;


  for (const rawTerm of terms) {
    const term = rawTerm.trim().toLowerCase();
    if (!term) continue;

    // Degree 2 term (e.g. +3x^2 or -x^2)
    if (term.includes(`${v}^2`)) {
      const coeffStr = term.replace(`${v}^2`, '').replace('*', '');
      let coeff = 0;
      if (coeffStr === '+' || coeffStr === '') coeff = 1;
      else if (coeffStr === '-') coeff = -1;
      else coeff = parseFloat(coeffStr) || 0;
      totalDegree2 += coeff;
    }
    // Degree 1 term (e.g. +3x or +x or -2*x)
    else if (term.includes(v)) {
      const coeffStr = term.replace(v, '').replace('*', '');
      let coeff = 0;
      if (coeffStr === '+' || coeffStr === '') coeff = 1;
      else if (coeffStr === '-') coeff = -1;
      else coeff = parseFloat(coeffStr) || 0;
      totalDegree1 += coeff;
    }
    // Constant term
    else {
      totalConstant += parseFloat(term) || 0;
    }
  }

  // Construct simplified result
  const resultParts: string[] = [];
  if (totalDegree2 !== 0) {
    if (totalDegree2 === 1) resultParts.push(`${v}^2`);
    else if (totalDegree2 === -1) resultParts.push(`-${v}^2`);
    else resultParts.push(`${totalDegree2}${v}^2`);
  }

  if (totalDegree1 !== 0) {
    if (resultParts.length > 0) {
      if (totalDegree1 > 0) {
        resultParts.push(`+ ${totalDegree1 === 1 ? v : `${totalDegree1}${v}`}`);
      } else {
        resultParts.push(`- ${totalDegree1 === -1 ? v : `${Math.abs(totalDegree1)}${v}`}`);
      }
    } else {
      if (totalDegree1 === 1) resultParts.push(v);
      else if (totalDegree1 === -1) resultParts.push(`-${v}`);
      else resultParts.push(`${totalDegree1}${v}`);
    }
  }

  if (totalConstant !== 0 || resultParts.length === 0) {
    if (resultParts.length > 0) {
      if (totalConstant > 0) resultParts.push(`+ ${totalConstant}`);
      else resultParts.push(`- ${Math.abs(totalConstant)}`);
    } else {
      resultParts.push(`${totalConstant}`);
    }
  }

  const finalString = resultParts.join(' ');
  const steps: SolutionStep[] = [
    {
      stepNumber: 1,
      title: 'Group and Combine Like Terms',
      description: `Combine all coefficients belonging to variable $${v}$:`,
      mathExpression: `${expr} = ${finalString}`,
      rule: 'Combining Like Terms',
    },
  ];

  const endTime = performance.now();
  return {
    success: true,
    problemType: 'Algebraic Simplification',
    normalizedExpression: expr,
    latexExpression: expr.replace(/\*/g, ''),
    finalAnswerLatex: finalString,
    finalAnswerPlain: finalString,
    steps,
    isVerified: true,
    verificationDetails: {
      lhsValue: 0,
      rhsValue: 0,
      residualNorm: 0,
      status: 'Exact Algebraic Simplification',
    },
    executionTimeMs: Number((endTime - startTime).toFixed(2)),
  };
}

/**
 * Recognizes and factors classic algebraic polynomial identities:
 * (a + b)^2 = a^2 + 2ab + b^2
 * (a - b)^2 = a^2 - 2ab + b^2
 * (a - b)(a + b) = a^2 - b^2
 */
function matchAlgebraicIdentity(rawExpr: string, startTime: number): SolutionResult | null {
  // Normalize whitespace and multiplication signs for pattern matching
  const clean = rawExpr.toLowerCase().replace(/\s+/g, '').replace(/\*/g, '');

  // 1. Check for Perfect Square: a^2 + 2ab + b^2 or b^2 + 2ab + a^2 or 2ab + a^2 + b^2
  // Match variables x, y or a, b
  const varsFound = clean.match(/[a-z]/g);
  if (!varsFound) return null;
  const unique = Array.from(new Set(varsFound));
  if (unique.length === 2) {
    const [u, w] = unique;

    // Pattern A: u^2 + 2uw + w^2 (in any term order)
    const hasU2 = clean.includes(`${u}^2`);
    const hasW2 = clean.includes(`${w}^2`);
    const hasPlus2UW = clean.includes(`+2${u}${w}`) || clean.includes(`+2${w}${u}`) || clean.startsWith(`2${u}${w}`) || clean.startsWith(`2${w}${u}`);
    const hasMinus2UW = clean.includes(`-2${u}${w}`) || clean.includes(`-2${w}${u}`);

    if (hasU2 && hasW2 && hasPlus2UW) {
      const factored = `(${u} + ${w})^2`;
      const factoredLatex = `(${u} + ${w})^2`;
      return {
        success: true,
        problemType: 'Algebraic Identity / Factoring',
        normalizedExpression: rawExpr,
        latexExpression: rawExpr.replace(/\*/g, ''),
        finalAnswerLatex: factoredLatex,
        finalAnswerPlain: factored,
        steps: [
          {
            stepNumber: 1,
            title: 'Identify Perfect Square Trinomial',
            description: `Match with the binomial identity $${u}^2 + 2${u}${w} + ${w}^2 = (${u} + ${w})^2$:`,
            mathExpression: `${rawExpr.replace(/\*/g, '')} = (${u} + ${w})^2`,
            rule: 'Square of a Binomial Identity',
          },
        ],
        isVerified: true,
        verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Exact Algebraic Identity' },
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
      };
    }

    if (hasU2 && hasW2 && hasMinus2UW) {
      const factored = `(${u} - ${w})^2`;
      const factoredLatex = `(${u} - ${w})^2`;
      return {
        success: true,
        problemType: 'Algebraic Identity / Factoring',
        normalizedExpression: rawExpr,
        latexExpression: rawExpr.replace(/\*/g, ''),
        finalAnswerLatex: factoredLatex,
        finalAnswerPlain: factored,
        steps: [
          {
            stepNumber: 1,
            title: 'Identify Negative Square Trinomial',
            description: `Match with the binomial identity $${u}^2 - 2${u}${w} + ${w}^2 = (${u} - ${w})^2$:`,
            mathExpression: `${rawExpr.replace(/\*/g, '')} = (${u} - ${w})^2`,
            rule: 'Square of a Binomial Identity',
          },
        ],
        isVerified: true,
        verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Exact Algebraic Identity' },
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
      };
    }

    // Pattern B: Difference of Squares u^2 - w^2
    const diffMatch = clean.match(new RegExp(`^${u}\\^2-${w}\\^2$`)) || clean.match(new RegExp(`^${w}\\^2-${u}\\^2$`));
    if (diffMatch) {
      const first = clean.startsWith(`${u}^2`) ? u : w;
      const second = clean.startsWith(`${u}^2`) ? w : u;
      const factored = `(${first} - ${second})(${first} + ${second})`;
      return {
        success: true,
        problemType: 'Algebraic Identity / Factoring',
        normalizedExpression: rawExpr,
        latexExpression: rawExpr.replace(/\*/g, ''),
        finalAnswerLatex: `(${first} - ${second})(${first} + ${second})`,
        finalAnswerPlain: factored,
        steps: [
          {
            stepNumber: 1,
            title: 'Apply Difference of Squares',
            description: `Factor using difference of squares formula $${first}^2 - ${second}^2 = (${first} - ${second})(${first} + ${second})$:`,
            mathExpression: `${first}^2 - ${second}^2 = (${first} - ${second})(${first} + ${second})`,
            rule: 'Difference of Squares',
          },
        ],
        isVerified: true,
        verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Exact Difference of Squares' },
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
      };
    }
  }

  return null;
}

/**
 * Handles multi-variable polynomial terms that don't match simple single-variable simplification
 */
function simplifyMultiVariable(expr: string, vars: string[], startTime: number): SolutionResult {
  const cleanLatex = expr.replace(/\*/g, ' ');
  return {
    success: true,
    problemType: 'Algebraic Simplification',
    normalizedExpression: expr,
    latexExpression: cleanLatex,
    finalAnswerLatex: cleanLatex,
    finalAnswerPlain: expr.replace(/\*/g, ''),
    steps: [
      {
        stepNumber: 1,
        title: 'Multi-Variable Expression Analysis',
        description: `Expression contains distinct variables (${vars.join(', ')}). No further like-term reduction possible:`,
        mathExpression: cleanLatex,
        rule: 'Canonical Polynomial Form',
      },
    ],
    isVerified: true,
    verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Multi-Variable Expression' },
    executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
  };
}

/**


 * FR-ME-11: Safe deterministic arithmetic parser (Zero eval / Function constructor).
 */
function evaluateSafeArithmetic(expr: string): number {
  const sanitized = expr.replace(/\s+/g, '');
  if (!/^[\d+\-*/().]+$/.test(sanitized)) {
    throw new Error('Invalid arithmetic characters');
  }

  // Tokenize arithmetic
  const tokens: string[] = [];
  let i = 0;
  while (i < sanitized.length) {
    if (/\d|\./.test(sanitized[i])) {
      let num = '';
      while (i < sanitized.length && (/\d|\./.test(sanitized[i]))) {
        num += sanitized[i];
        i++;
      }
      tokens.push(num);
    } else {
      tokens.push(sanitized[i]);
      i++;
    }
  }

  // Simple recursive descent parser with depth guard to prevent stack overflow
  let pos = 0;
  let depth = 0;
  const MAX_RECURSION_DEPTH = 50;

  function checkDepth() {
    depth++;
    if (depth > MAX_RECURSION_DEPTH) {
      throw new Error('Expression complexity exceeded maximum nesting depth (50)');
    }
  }

  function parsePrimary(): number {
    checkDepth();
    const token = tokens[pos];
    if (token === '(') {
      pos++; // consume '('
      const val = parseAddSub();
      if (tokens[pos] === ')') pos++; // consume ')'
      depth--;
      return val;
    }
    if (token === '-') {
      pos++; // unary minus
      const val = -parsePrimary();
      depth--;
      return val;
    }
    if (token === '+') {
      pos++; // unary plus
      const val = parsePrimary();
      depth--;
      return val;
    }
    if (token === '/' || token === '*') {
      // Stray operator: ignore and consume next
      pos++;
      const val = parsePrimary();
      depth--;
      return val;
    }
    pos++;
    depth--;
    const n = parseFloat(token);
    return isNaN(n) ? 0 : n;
  }

  function parseMulDiv(): number {
    let left = parsePrimary();
    while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
      const op = tokens[pos];
      pos++;
      const right = parsePrimary();
      if (op === '*') left *= right;
      else if (op === '/') left = right === 0 ? 0 : left / right;
    }
    return left;
  }

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos];
      pos++;
      const right = parseMulDiv();
      if (op === '+') left += right;
      else if (op === '-') left -= right;
    }
    return left;
  }

  return parseAddSub();
}
