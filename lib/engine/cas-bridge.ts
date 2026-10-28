/**
 * MathLens Nerdamer CAS Bridge
 * Clean, safe wrapper around nerdamer 2.0 Computer Algebra System.
 * Handles advanced symbolic calculus, expansion, factoring, and exact evaluation.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nerdamer = require('nerdamer');

export function formatTrigInversesLatex(latex: string): string {
  if (!latex) return '';
  return latex
    .replace(/\\arctan\b/g, '\\tan^{-1}')
    .replace(/\\arcsin\b/g, '\\sin^{-1}')
    .replace(/\\arccos\b/g, '\\cos^{-1}')
    .replace(/\\arccot\b/g, '\\cot^{-1}')
    .replace(/\\arcsec\b/g, '\\sec^{-1}')
    .replace(/\\arccsc\b/g, '\\csc^{-1}')
    .replace(/\\operatorname\{arctan\}/g, '\\tan^{-1}')
    .replace(/\\operatorname\{arcsin\}/g, '\\sin^{-1}')
    .replace(/\\operatorname\{arccos\}/g, '\\cos^{-1}')
    .replace(/\\operatorname\{atan\}/g, '\\tan^{-1}')
    .replace(/\\operatorname\{asin\}/g, '\\sin^{-1}')
    .replace(/\\operatorname\{acos\}/g, '\\cos^{-1}');
}

export function formatTrigInversesText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\b(?:arctan|atan)\b/g, 'tan^-1')
    .replace(/\b(?:arcsin|asin)\b/g, 'sin^-1')
    .replace(/\b(?:arccos|acos)\b/g, 'cos^-1')
    .replace(/\b(?:arccot|acot)\b/g, 'cot^-1')
    .replace(/\b(?:arcsec|asec)\b/g, 'sec^-1')
    .replace(/\b(?:arccsc|acsc)\b/g, 'csc^-1');
}

export interface SymbolicResult {
  text: string;
  latex: string;
}

export class CASBridge {
  /**
   * Symbolically differentiate an expression with respect to a variable
   */
  static differentiate(expr: string, variable: string = 'x'): SymbolicResult {
    try {
      const parsed = nerdamer.diff(expr, variable);
      return {
        text: formatTrigInversesText(parsed.text()),
        latex: formatTrigInversesLatex(parsed.toTeX()),
      };
    } catch (err) {
      throw new Error(`Symbolic differentiation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Symbolically integrate an expression with respect to a variable
   */
  static integrate(expr: string, variable: string = 'x'): SymbolicResult {
    try {
      const parsed = nerdamer.integrate(expr, variable);
      return {
        text: formatTrigInversesText(parsed.text()),
        latex: formatTrigInversesLatex(parsed.toTeX()),
      };
    } catch (err) {
      throw new Error(`Symbolic integration failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Symbolically simplify an algebraic expression
   */
  static simplify(expr: string): SymbolicResult {
    try {
      const parsed = nerdamer(expr);
      return {
        text: formatTrigInversesText(parsed.text()),
        latex: formatTrigInversesLatex(parsed.toTeX()),
      };
    } catch (err) {
      throw new Error(`Symbolic simplification failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Symbolically factor a polynomial
   */
  static factor(expr: string): SymbolicResult {
    try {
      const parsed = nerdamer.factor(expr);
      return {
        text: parsed.text(),
        latex: parsed.toTeX(),
      };
    } catch (err) {
      throw new Error(`Symbolic factoring failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Symbolically evaluate limit of an expression
   */
  static limit(expr: string, variable: string = 'x', value: string = '0'): SymbolicResult {
    try {
      const parsed = nerdamer.limit(expr, variable, value);
      return {
        text: formatTrigInversesText(parsed.text()),
        latex: formatTrigInversesLatex(parsed.toTeX()),
      };
    } catch (err) {
      throw new Error(`Symbolic limit failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Symbolically evaluate definite integral via Fundamental Theorem of Calculus
   */
  static defint(
    expr: string,
    variable: string = 'x',
    lower: string = '0',
    upper: string = '1'
  ): {
    antiderivative: SymbolicResult;
    upperSub: SymbolicResult;
    upperVal: SymbolicResult;
    lowerSub: SymbolicResult;
    lowerVal: SymbolicResult;
    result: SymbolicResult;
    decimal: number;
  } {
    try {
      const anti = nerdamer.integrate(expr, variable);
      const subB = nerdamer(anti.text()).sub(variable, upper);
      const evalB = nerdamer(subB.text());
      const subA = nerdamer(anti.text()).sub(variable, lower);
      const evalA = nerdamer(subA.text());
      const diff = nerdamer(`${subB.text()} - (${subA.text()})`);
      const numVal = Number(nerdamer(diff.text()).evaluate().text());

      return {
        antiderivative: {
          text: formatTrigInversesText(anti.text()),
          latex: formatTrigInversesLatex(anti.toTeX()),
        },
        upperSub: {
          text: formatTrigInversesText(subB.text()),
          latex: formatTrigInversesLatex(subB.toTeX()),
        },
        upperVal: {
          text: formatTrigInversesText(evalB.text()),
          latex: formatTrigInversesLatex(evalB.toTeX()),
        },
        lowerSub: {
          text: formatTrigInversesText(subA.text()),
          latex: formatTrigInversesLatex(subA.toTeX()),
        },
        lowerVal: {
          text: formatTrigInversesText(evalA.text()),
          latex: formatTrigInversesLatex(evalA.toTeX()),
        },
        result: {
          text: formatTrigInversesText(diff.text()),
          latex: formatTrigInversesLatex(diff.toTeX()),
        },
        decimal: Number.isFinite(numVal) ? Number(numVal.toFixed(4)) : 0,
      };
    } catch (err) {
      throw new Error(`Symbolic definite integral failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
