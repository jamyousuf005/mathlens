/**
 * MathLens Advanced Integration Methods Engine
 * Implements standard textbook pedagogical derivations for:
 * 1. Integration by Parts (LIATE rule, u, dv, du, v table)
 * 2. u-Substitution (inner function, differential substitution du = g'(x)dx, back-substitution)
 * 3. Partial Fraction Decomposition (distinct linear factors, partial fraction form)
 * 4. Special Inverse Trigonometric & Standard Antiderivative Formulas
 *    - \int 1/(a^2 + x^2) dx = (1/a) \tan^{-1}(x/a) + C
 *    - \int 1/\sqrt{a^2 - x^2} dx = \sin^{-1}(x/a) + C
 *    - \int 1/(x^2 - a^2) dx = (1/(2a)) \ln|(x-a)/(x+a)| + C
 */

import { SolutionStep } from './types';
import { formatTrigInversesLatex } from './cas-bridge';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nerdamer = require('nerdamer');

export interface AdvancedIntegrationResult {
  methodName: string;
  antiderivativeLatex: string;
  antiderivativePlain: string;
  steps: SolutionStep[];
}

function toTex(expr: string): string {
  try {
    return formatTrigInversesLatex(nerdamer(expr).toTeX());
  } catch {
    return expr;
  }
}

/**
 * 1. Inverse Trigonometric Standard Forms:
 *    - \int 1/(a^2 + x^2) dx = (1/a) \tan^{-1}(x/a) + C
 *    - \int 1/\sqrt{a^2 - x^2} dx = \sin^{-1}(x/a) + C
 */
export function tryInverseTrigStandardForms(
  expr: string,
  variable: string = 'x'
): AdvancedIntegrationResult | null {
  const clean = expr.replace(/\s+/g, '');

  // Case 1: 1 / (a^2 + x^2) or 1 / (x^2 + a^2) or (1)/(a^2 + x^2)
  const tanMatch =
    clean.match(/^(?:\(1\)|1)\/\(?(\d+(?:\.\d+)?)\+([a-zA-Z])\^2\)?$/) ||
    clean.match(/^(?:\(1\)|1)\/\(?([a-zA-Z])\^2\+(\d+(?:\.\d+)?)\)?$/);

  if (tanMatch) {
    const numStr = tanMatch[1];
    const varStr = (tanMatch[2] || 'x').toLowerCase();
    if (varStr === variable.toLowerCase() && numStr) {
      const aSquared = Number(numStr);
      const a = Math.sqrt(aSquared);
      const aStr = Number.isInteger(a) ? String(a) : `\\sqrt{${aSquared}}`;
      const coeffTex = a === 1 ? '' : Number.isInteger(a) ? `\\frac{1}{${aStr}}` : `\\frac{1}{\\sqrt{${aSquared}}}`;
      const argTex = a === 1 ? variable : `\\frac{${variable}}{${aStr}}`;
      const antiLatex = `${coeffTex}\\tan^{-1}\\left(${argTex}\\right)`.trim();
      const antiPlain = a === 1 ? `tan^-1(${variable})` : `(1/${aStr})*tan^-1(${variable}/${aStr})`;

      return {
        methodName: 'Standard Inverse Tangent Form',
        antiderivativeLatex: antiLatex,
        antiderivativePlain: antiPlain,
        steps: [
          {
            stepNumber: 1,
            title: 'Identify standard inverse trigonometric pattern',
            description: `Match the integrand to the standard integral formula \\int \\frac{1}{a^2 + ${variable}^2} d${variable} = \\frac{1}{a} \\tan^{-1}\\left(\\frac{${variable}}{a}\\right) + C.`,
            mathExpression: `\\int \\frac{1}{a^2 + ${variable}^2} d${variable} = \\frac{1}{a} \\tan^{-1}\\left(\\frac{${variable}}{a}\\right) + C`,
            rule: 'Inverse Tangent Identity',
          },
          {
            stepNumber: 2,
            title: 'Determine constant parameter a',
            description: `Here, a^2 = ${aSquared}, so a = ${aStr}.`,
            mathExpression: `a = \\sqrt{${aSquared}} = ${aStr}`,
            rule: 'Constant Identification',
          },
          {
            stepNumber: 3,
            title: 'Substitute parameter into antiderivative formula',
            description: `Substitute a = ${aStr} into the standard formula to obtain the exact antiderivative.`,
            mathExpression: `\\int \\left(${toTex(expr)}\\right) d${variable} = ${antiLatex} + C`,
            rule: 'Antiderivative Formula',
          },
        ],
      };
    }
  }

  // Case 2: 1 / \sqrt{a^2 - x^2}
  const sinMatch = clean.match(/^1\/sqrt\((\d+(?:\.\d+)?)-([a-zA-Z])\^2\)$/);
  if (sinMatch) {
    const aSquared = Number(sinMatch[1]);
    const varStr = sinMatch[2].toLowerCase();
    if (varStr === variable.toLowerCase()) {
      const a = Math.sqrt(aSquared);
      const aStr = Number.isInteger(a) ? String(a) : `\\sqrt{${aSquared}}`;
      const argTex = a === 1 ? variable : `\\frac{${variable}}{${aStr}}`;
      const antiLatex = `\\sin^{-1}\\left(${argTex}\\right)`;
      const antiPlain = a === 1 ? `sin^-1(${variable})` : `sin^-1(${variable}/${aStr})`;

      return {
        methodName: 'Standard Inverse Sine Form',
        antiderivativeLatex: antiLatex,
        antiderivativePlain: antiPlain,
        steps: [
          {
            stepNumber: 1,
            title: 'Identify standard inverse sine pattern',
            description: `Match the integrand to the standard formula \\int \\frac{1}{\\sqrt{a^2 - ${variable}^2}} d${variable} = \\sin^{-1}\\left(\\frac{${variable}}{a}\\right) + C.`,
            mathExpression: `\\int \\frac{1}{\\sqrt{a^2 - ${variable}^2}} d${variable} = \\sin^{-1}\\left(\\frac{${variable}}{a}\\right) + C`,
            rule: 'Inverse Sine Identity',
          },
          {
            stepNumber: 2,
            title: 'Determine constant parameter a',
            description: `Here, a^2 = ${aSquared}, so a = ${aStr}.`,
            mathExpression: `a = \\sqrt{${aSquared}} = ${aStr}`,
            rule: 'Constant Identification',
          },
          {
            stepNumber: 3,
            title: 'Substitute parameter into antiderivative formula',
            description: `Substitute a = ${aStr} into the inverse sine formula.`,
            mathExpression: `\\int \\left(${toTex(expr)}\\right) d${variable} = ${antiLatex} + C`,
            rule: 'Antiderivative Formula',
          },
        ],
      };
    }
  }

  return null;
}

/**
 * 2. Integration by Parts: \int u dv = u v - \int v du
 * Follows LIATE priority to select u:
 * L: Logarithmic (ln, log)
 * I: Inverse trigonometric (tan^-1, sin^-1, cos^-1)
 * A: Algebraic (x, x^2, polynomial)
 * T: Trigonometric (sin, cos)
 * E: Exponential (e^x, a^x)
 */
export function tryIntegrationByParts(
  expr: string,
  variable: string = 'x'
): AdvancedIntegrationResult | null {
  const clean = expr.trim();

  // Pattern A: Polynomial * Exponential, e.g. x * e^x, (x+1)*e^x
  const polyExp = clean.match(/^(.+?)(?:\s*\*|\s+)?e\^(.+)$/);
  // Pattern B: Polynomial * Trig, e.g. x * cos(x), x * sin(x)
  const polyTrig = clean.match(/^(.+?)(?:\s*\*|\s+)?(sin|cos)\((.+)\)$/);
  // Pattern C: Pure Logarithm, e.g. ln(x), log(x), or x * ln(x)
  const logMatch = clean.match(/^(?:(.+?)(?:\s*\*|\s+)?)?(?:ln|log)\((.+)\)$/);

  let uExpr = '';
  let dvExpr = '';
  let uReason = '';

  if (polyExp && !clean.includes('sin') && !clean.includes('cos') && !clean.includes('log') && !clean.includes('ln')) {
    uExpr = polyExp[1].replace(/\s*\*?\s*$/, '').trim();
    // If exponential has a non-linear exponent like x^2, that is u-sub, not standard parts!
    if (polyExp[2].includes('^') && polyExp[2] !== variable) {
      return null;
    }
    dvExpr = `e^(${polyExp[2]})`;
    uReason = 'By the LIATE rule, the algebraic factor is chosen as u and the exponential factor as dv.';
  } else if (polyTrig) {
    uExpr = polyTrig[1].replace(/\s*\*?\s*$/, '').trim();
    // If trig has a non-linear argument like x^2, that is u-sub, not standard parts!
    if (polyTrig[3].includes('^') && polyTrig[3] !== variable) {
      return null;
    }
    dvExpr = `${polyTrig[2]}(${polyTrig[3]})`;
    uReason = 'By the LIATE rule, the algebraic factor is chosen as u and the trigonometric factor as dv.';
  } else if (logMatch) {
    if (logMatch[1]) {
      uExpr = `log(${logMatch[2]})`;
      dvExpr = logMatch[1].replace(/\s*\*?\s*$/, '').trim();
      uReason = 'By the LIATE rule, the logarithmic factor has higher priority and is chosen as u, while the algebraic factor is dv.';
    } else {
      uExpr = `log(${logMatch[2]})`;
      dvExpr = '1';
      uReason = 'For a lone logarithmic integrand, we apply integration by parts setting u = ln(x) and dv = 1 dx.';
    }
  }

  if (!uExpr || !dvExpr) return null;

  try {
    const du = nerdamer.diff(uExpr, variable).text();
    const v = nerdamer.integrate(dvExpr, variable).text();
    const v_du = nerdamer(`${v} * (${du})`).text();
    const int_v_du = nerdamer.integrate(v_du, variable).text();
    const result = nerdamer(`(${uExpr}) * (${v}) - (${int_v_du})`).text();

    const uTex = toTex(uExpr);
    const dvTex = `${toTex(dvExpr)} \\, d${variable}`;
    const duTex = `${toTex(du)} \\, d${variable}`;
    const vTex = toTex(v);
    const vDuTex = toTex(v_du);
    const intVduTex = toTex(int_v_du);
    const uvTex = toTex(`(${uExpr}) * (${v})`);
    const finalLatex = formatTrigInversesLatex(nerdamer(result).toTeX());

    return {
      methodName: 'Integration by Parts',
      antiderivativeLatex: finalLatex,
      antiderivativePlain: result,
      steps: [
        {
          stepNumber: 1,
          title: 'Select u and dv using the LIATE Rule',
          description: `${uReason} Recall the integration by parts formula: \\int u \\, dv = u v - \\int v \\, du.`,
          mathExpression: `\\int u \\, dv = u v - \\int v \\, du`,
          rule: 'Integration by Parts Formula',
        },
        {
          stepNumber: 2,
          title: 'Compute differential du and antiderivative v',
          description: `Differentiate u to find du, and integrate dv to find v.`,
          mathExpression: `u = ${uTex} \\implies du = ${duTex}, \\quad dv = ${dvTex} \\implies v = ${vTex}`,
          rule: 'Parts Differential Table',
        },
        {
          stepNumber: 3,
          title: 'Apply the Integration by Parts formula',
          description: `Substitute u, v, and du into the formula: u \\cdot v - \\int v \\, du.`,
          mathExpression: `\\int \\left(${toTex(expr)}\\right) d${variable} = \\left(${uTex}\\right)\\left(${vTex}\\right) - \\int \\left(${vDuTex}\\right) d${variable}`,
          rule: 'Formula Substitution',
        },
        {
          stepNumber: 4,
          title: 'Evaluate the remaining integral \\int v \\, du',
          description: `Integrate the remaining product v \\, du = ${vDuTex}.`,
          mathExpression: `\\int \\left(${vDuTex}\\right) d${variable} = ${intVduTex}`,
          rule: 'Secondary Integration',
        },
        {
          stepNumber: 5,
          title: 'Assemble final antiderivative',
          description: `Combine terms u \\cdot v - \\int v \\, du and append the constant of integration C.`,
          mathExpression: `\\int \\left(${toTex(expr)}\\right) d${variable} = ${uvTex} - \\left(${intVduTex}\\right) + C = ${finalLatex} + C`,
          rule: 'Indefinite Integral',
        },
      ],
    };
  } catch {
    return null;
  }
}

/**
 * 3. Integration by u-Substitution (Change of Variables)
 * Handles composite forms:
 * - g'(x) * f(g(x)), e.g. 2x * cos(x^2), x / (1 + x^2), 3x^2 * e^(x^3)
 */
export function tryUSubstitution(
  expr: string,
  variable: string = 'x'
): AdvancedIntegrationResult | null {
  const clean = expr.trim();

  // Candidate inner functions g(x)
  let candidateG: string | null = null;

  // Case 1: rational x / (1 + x^2) or x / (x^2 + a)
  const rationalMatch = clean.match(/^([a-zA-Z0-9*^]+)\s*\/\s*\(?([a-zA-Z0-9+*^ -]+)\)?$/);
  if (rationalMatch) {
    const num = rationalMatch[1].replace(/\s+/g, '');
    const den = rationalMatch[2].replace(/\s+/g, '');
    if (den.includes(`${variable}^2`) && (num === variable || num === `2*${variable}` || num === `2${variable}`)) {
      candidateG = den;
    }
  }

  // Case 2: trig composition, e.g. 2*x*cos(x^2) or x*sin(x^2)
  const trigComp = clean.match(/^(.+?)(?:\s*\*|\s+)?(sin|cos)\((.+)\)$/);
  if (!candidateG && trigComp) {
    const arg = trigComp[3].trim();
    if (arg.includes('^') || arg !== variable) {
      candidateG = arg;
    }
  }

  // Case 3: exponential composition, e.g. x * e^(x^2)
  const expComp = clean.match(/^(.+?)(?:\s*\*|\s+)?e\^\(?([a-zA-Z0-9+*^ -]+)\)?$/);
  if (!candidateG && expComp) {
    const arg = expComp[2].trim();
    if (arg.includes('^') || arg !== variable) {
      candidateG = arg;
    }
  }

  if (!candidateG || candidateG === variable) return null;

  try {
    const gTex = toTex(candidateG);
    const dg = nerdamer.diff(candidateG, variable).text();
    const dgTex = toTex(dg);

    // Check if expr / g'(x) simplifies to a pure function of u
    const candidateU = 'u_sub_var';
    const divided = nerdamer(`(${clean}) / (${dg})`).text();
    const inTermsOfU = nerdamer(divided).sub(candidateG, candidateU).text();

    // If divided still contains the original variable (not cancelable), u-sub does not cleanly apply
    if (nerdamer(inTermsOfU).variables().includes(variable)) {
      return null;
    }

    const intU = nerdamer.integrate(inTermsOfU, candidateU).text();
    const backSub = nerdamer(intU).sub(candidateU, candidateG).text();
    const finalLatex = formatTrigInversesLatex(nerdamer(backSub).toTeX());
    const intUTex = formatTrigInversesLatex(nerdamer(intU).toTeX()).replace(/u_sub_var/g, 'u');
    const integrandUTex = formatTrigInversesLatex(nerdamer(inTermsOfU).toTeX()).replace(/u_sub_var/g, 'u');

    return {
      methodName: 'Integration by u-Substitution',
      antiderivativeLatex: finalLatex,
      antiderivativePlain: backSub,
      steps: [
        {
          stepNumber: 1,
          title: 'Identify inner function for substitution',
          description: `Choose the substitution variable u = g(${variable}) to simplify the integrand.`,
          mathExpression: `u = ${gTex}`,
          rule: 'Substitution Selection',
        },
        {
          stepNumber: 2,
          title: 'Compute the differential du',
          description: `Differentiate u with respect to ${variable}: du = g'(${variable}) d${variable}.`,
          mathExpression: `du = \\left(${dgTex}\\right) d${variable} \\implies d${variable} = \\frac{du}{${dgTex}}`,
          rule: 'Differential Transformation',
        },
        {
          stepNumber: 3,
          title: 'Rewrite integral in terms of u',
          description: `Substitute u and du into the integral to express entirely in terms of u.`,
          mathExpression: `\\int \\left(${toTex(clean)}\\right) d${variable} = \\int \\left(${integrandUTex}\\right) du`,
          rule: 'Change of Variables',
        },
        {
          stepNumber: 4,
          title: 'Evaluate antiderivative with respect to u',
          description: `Integrate the simplified integrand with respect to u.`,
          mathExpression: `\\int \\left(${integrandUTex}\\right) du = ${intUTex}`,
          rule: 'Standard Integration',
        },
        {
          stepNumber: 5,
          title: 'Back-substitute u = g(x)',
          description: `Replace u with ${gTex} to express the solution in terms of the original variable ${variable}, appending integration constant C.`,
          mathExpression: `\\int \\left(${toTex(clean)}\\right) d${variable} = ${finalLatex} + C`,
          rule: 'Back-Substitution & Constant of Integration',
        },
      ],
    };
  } catch {
    return null;
  }
}

/**
 * 4. Partial Fraction Decomposition:
 * Decomposes rational expressions P(x)/Q(x) into simpler partial fractions
 * e.g. 1/(x^2 - 1) -> 1/(2*(x-1)) - 1/(2*(x+1))
 */
export function tryPartialFractions(
  expr: string,
  variable: string = 'x'
): AdvancedIntegrationResult | null {
  const clean = expr.trim();
  // Only attempt on rational expressions with a denominator of degree >= 2
  if (!clean.includes('/')) return null;

  try {
    const pf = nerdamer.partfrac(clean, variable).text();
    // If partfrac didn't decompose into a sum (no '+' or multiple terms), not a partial fractions candidate
    if (pf === clean || !pf.includes('/')) return null;

    const integratedPf = nerdamer.integrate(pf, variable).text();
    const pfTex = toTex(pf);
    const finalLatex = formatTrigInversesLatex(nerdamer(integratedPf).toTeX());

    return {
      methodName: 'Partial Fraction Decomposition',
      antiderivativeLatex: finalLatex,
      antiderivativePlain: integratedPf,
      steps: [
        {
          stepNumber: 1,
          title: 'Decompose rational expression into partial fractions',
          description: `Factor the polynomial denominator into linear factors to decompose the rational expression.`,
          mathExpression: `${toTex(clean)} = ${pfTex}`,
          rule: 'Partial Fraction Decomposition',
        },
        {
          stepNumber: 2,
          title: 'Integrate decomposed terms individually',
          description: `Apply the sum rule of integration to evaluate each simpler rational term using standard logarithmic forms \\int \\frac{1}{x - c} dx = \\ln|x - c|.`,
          mathExpression: `\\int \\left(${pfTex}\\right) d${variable}`,
          rule: 'Term-by-Term Integration',
        },
        {
          stepNumber: 3,
          title: 'Assemble final logarithmic antiderivative',
          description: `Combine integrated partial fraction components and append arbitrary constant C.`,
          mathExpression: `\\int \\left(${toTex(clean)}\\right) d${variable} = ${finalLatex} + C`,
          rule: 'Indefinite Integral',
        },
      ],
    };
  } catch {
    return null;
  }
}

/**
 * Master dispatcher for advanced integration methods.
 * Tries the authentic textbook techniques in order:
 * 1. Standard Inverse Trig Forms
 * 2. Integration by Parts
 * 3. u-Substitution
 * 4. Partial Fraction Decomposition
 */
export function solveAdvancedIntegration(
  expr: string,
  variable: string = 'x'
): AdvancedIntegrationResult | null {
  // 1. Standard Inverse Trig Forms (e.g. 1/(1+x^2), 1/(4+x^2), 1/\sqrt{1-x^2})
  const invTrig = tryInverseTrigStandardForms(expr, variable);
  if (invTrig) return invTrig;

  // 2. Integration by Parts (e.g. x*e^x, x*cos(x), ln(x))
  const parts = tryIntegrationByParts(expr, variable);
  if (parts) return parts;

  // 3. u-Substitution (e.g. 2x*cos(x^2), x/(1+x^2))
  const usub = tryUSubstitution(expr, variable);
  if (usub) return usub;

  // 4. Partial Fraction Decomposition (e.g. 1/(x^2 - 1), 1/(x^2 - 4))
  const pfrac = tryPartialFractions(expr, variable);
  if (pfrac) return pfrac;

  return null;
}
