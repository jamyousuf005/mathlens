/**
 * MathLens Nerdamer CAS Bridge
 * Clean, safe wrapper around nerdamer 2.0 Computer Algebra System.
 * Handles advanced symbolic calculus, expansion, factoring, and exact evaluation.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nerdamer = require('nerdamer');

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
        text: parsed.text(),
        latex: parsed.toTeX(),
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
        text: parsed.text(),
        latex: parsed.toTeX(),
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
        text: parsed.text(),
        latex: parsed.toTeX(),
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
}
