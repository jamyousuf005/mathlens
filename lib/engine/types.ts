/**
 * MathLens Engine AST Types & Step Definitions
 * Strict deterministic representations for Computer Algebra System (CAS).
 */

export type TokenType =
  | 'NUMBER'
  | 'IDENTIFIER'
  | 'PLUS'
  | 'MINUS'
  | 'MULTIPLY'
  | 'DIVIDE'
  | 'POWER'
  | 'EQUALS'
  | 'LPAREN'
  | 'RPAREN'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export type ASTNode =
  | NumberNode
  | IdentifierNode
  | UnaryOpNode
  | BinaryOpNode
  | EquationNode;

export interface NumberNode {
  type: 'Number';
  value: number;
  raw: string;
}

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
}

export interface UnaryOpNode {
  type: 'UnaryOp';
  operator: '+' | '-';
  argument: ASTNode;
}

export interface BinaryOpNode {
  type: 'BinaryOp';
  operator: '+' | '-' | '*' | '/' | '^';
  left: ASTNode;
  right: ASTNode;
}

export interface EquationNode {
  type: 'Equation';
  left: ASTNode;
  right: ASTNode;
}

export interface SolutionStep {
  stepNumber: number;
  title: string;
  description: string;
  mathExpression: string; // Plain / LaTeX representation
  rule: string;
}

export interface SolutionResult {
  success: boolean;
  problemType: 'Quadratic Equation' | 'Linear Equation' | 'Arithmetic' | 'Algebraic Simplification' | 'Algebraic Identity / Factoring' | 'Unsupported';
  normalizedExpression: string;
  latexExpression: string;
  finalAnswerLatex: string;
  finalAnswerPlain: string;
  roots?: number[];
  steps: SolutionStep[];
  isVerified: boolean;
  verificationDetails: {
    lhsValue: number;
    rhsValue: number;
    residualNorm: number;
    status: string;
  };
  executionTimeMs: number;
  error?: string;
}
