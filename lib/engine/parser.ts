import { MathParseError } from './errors';
import { ASTNode, BinaryOpNode, EquationNode, FunctionCallNode, IdentifierNode, NumberNode, PostfixOpNode, Token, UnaryOpNode } from './types';

function validateTokenSequence(tokens: Token[]): void {
  for (let i = 0; i < tokens.length - 1; i++) {
    const current = tokens[i];
    const next = tokens[i + 1];
    if (
      (current.type === 'PLUS' && next.type === 'PLUS') ||
      (current.type === 'MINUS' && next.type === 'MINUS')
    ) {
      throw new MathParseError('Consecutive operators are not allowed', next.position);
    }
  }
}

export class Parser {
  private readonly tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    validateTokenSequence(tokens);
    this.tokens = tokens;
  }

  parse(): ASTNode {
    const left = this.parseExpression();
    if (this.current().type === 'EQUALS') {
      this.eat('EQUALS');
      const right = this.parseExpression();
      if (this.current().type === 'EQUALS') {
        throw new MathParseError('Chained equations are unsupported', this.current().position);
      }
      if (this.current().type !== 'EOF') {
        throw new MathParseError(`Unexpected token '${this.current().value}'`, this.current().position);
      }
      const equation: EquationNode = { type: 'Equation', left, right };
      return equation;
    }
    if (this.current().type !== 'EOF') {
      throw new MathParseError(`Unexpected token '${this.current().value}'`, this.current().position);
    }
    return left;
  }

  parseEquationOnly(): EquationNode {
    const left = this.parseExpression();
    if (this.current().type !== 'EQUALS') {
      throw new MathParseError("Expected '=' in equation", this.current().position);
    }
    this.eat('EQUALS');
    const right = this.parseExpression();
    return { type: 'Equation', left, right };
  }

  private current(): Token {
    return this.tokens[this.pos] ?? {
      type: 'EOF',
      value: '',
      position: this.tokens.length,
    };
  }

  private eat(type?: Token['type']): Token {
    const token = this.current();
    if (type && token.type !== type) {
      throw new MathParseError(`Expected ${type} but found '${token.value || token.type}'`, token.position);
    }
    this.pos++;
    return token;
  }

  private parseExpression(): ASTNode {
    return this.parseAddSub();
  }

  private parseAddSub(): ASTNode {
    let node = this.parseMulDiv();
    while (this.current().type === 'PLUS' || this.current().type === 'MINUS') {
      const operator = this.eat().type === 'PLUS' ? '+' : '-';
      const right = this.parseMulDiv();
      const binary: BinaryOpNode = { type: 'BinaryOp', operator, left: node, right };
      node = binary;
    }
    return node;
  }

  private parseMulDiv(): ASTNode {
    let node = this.parseUnary();
    while (this.current().type === 'MULTIPLY' || this.current().type === 'DIVIDE') {
      const operator = this.eat().type === 'MULTIPLY' ? '*' : '/';
      const right = this.parseUnary();
      const binary: BinaryOpNode = { type: 'BinaryOp', operator, left: node, right };
      node = binary;
    }
    return node;
  }

  private parseUnary(): ASTNode {
    if (this.current().type === 'MINUS') {
      this.eat('MINUS');
      const argument = this.parseUnary();
      const unary: UnaryOpNode = { type: 'UnaryOp', operator: '-', argument };
      return unary;
    }
    if (this.current().type === 'PLUS') {
      this.eat('PLUS');
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): ASTNode {
    const left = this.parsePostfix();
    if (this.current().type === 'POWER') {
      this.eat('POWER');
      const right = this.parseUnary();
      const binary: BinaryOpNode = { type: 'BinaryOp', operator: '^', left, right };
      return binary;
    }
    return left;
  }

  private parsePostfix(): ASTNode {
    let node = this.parsePrimary();
    while (this.current().type === 'FACTORIAL' || this.current().type === 'PERCENT') {
      const op = this.eat();
      node = {
        type: 'PostfixOp',
        operator: op.type === 'FACTORIAL' ? '!' : '%',
        argument: node,
      };
    }
    return node;
  }

  private parsePrimary(): ASTNode {
    const token = this.current();

    if (token.type === 'NUMBER') {
      this.eat('NUMBER');
      const value = Number(token.value);
      if (!Number.isFinite(value)) {
        throw new MathParseError(`Invalid number '${token.value}'`, token.position);
      }
      const number: NumberNode = { type: 'Number', value, raw: token.value };
      return number;
    }

    if (token.type === 'IDENTIFIER') {
      const name = token.value.toLowerCase();
      if (['sqrt', 'abs', 'sin', 'cos', 'tan', 'log', 'ln'].includes(name)) {
        this.eat('IDENTIFIER');
        if (this.current().type !== 'LPAREN') {
          throw new MathParseError(`Expected '(' after function '${name}'`, this.current().position);
        }
        this.eat('LPAREN');
        const argument = this.parseExpression();
        if (this.current().type !== 'RPAREN') {
          throw new MathParseError(`Expected ')' after argument of '${name}'`, this.current().position);
        }
        this.eat('RPAREN');
        return {
          type: 'FunctionCall',
          name: name as FunctionCallNode['name'],
          argument,
        };
      }

      this.eat('IDENTIFIER');
      const identifier: IdentifierNode = { type: 'Identifier', name };
      return identifier;
    }

    if (token.type === 'PIPE') {
      this.eat('PIPE');
      const argument = this.parseExpression();
      if (this.current().type !== 'PIPE') {
        throw new MathParseError('Missing closing pipe | for absolute value', this.current().position);
      }
      this.eat('PIPE');
      return {
        type: 'FunctionCall',
        name: 'abs',
        argument,
      };
    }

    if (token.type === 'LPAREN') {
      this.eat('LPAREN');
      const expression = this.parseExpression();
      if (this.current().type !== 'RPAREN') {
        throw new MathParseError('Missing closing parenthesis', this.current().position);
      }
      this.eat('RPAREN');
      return expression;
    }

    if (token.type === 'RPAREN') {
      throw new MathParseError('Unexpected closing parenthesis', token.position);
    }

    throw new MathParseError(`Unexpected token '${token.value || token.type}'`, token.position);
  }
}
