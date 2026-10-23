/**
 * MathLens Engine - Lexer (Tokenizer)
 * FR-ME-02: Converts mathematical expression string into formal token stream.
 */

// NOTE: `tokenize` is exported for future formal parser integration.
// The main solver pipeline currently uses its own lightweight string-based term
// extraction. When a full recursive-descent parser is wired in, import from here.
import { Token } from './types';

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Number (integers and floating decimals)
    if (/\d/.test(char) || (char === '.' && i + 1 < input.length && /\d/.test(input[i + 1]))) {
      let numStr = '';
      const startPos = i;
      while (i < input.length && (/\d/.test(input[i]) || input[i] === '.')) {
        numStr += input[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr, position: startPos });
      continue;
    }

    // Variable Identifier (x, y, z, etc.)
    if (/[a-zA-Z]/.test(char)) {
      tokens.push({ type: 'IDENTIFIER', value: char, position: i });
      i++;
      continue;
    }

    // Mathematical Operators
    switch (char) {
      case '+':
        tokens.push({ type: 'PLUS', value: '+', position: i });
        break;
      case '-':
        tokens.push({ type: 'MINUS', value: '-', position: i });
        break;
      case '*':
        tokens.push({ type: 'MULTIPLY', value: '*', position: i });
        break;
      case '/':
        tokens.push({ type: 'DIVIDE', value: '/', position: i });
        break;
      case '^':
        tokens.push({ type: 'POWER', value: '^', position: i });
        break;
      case '=':
        tokens.push({ type: 'EQUALS', value: '=', position: i });
        break;
      case '(':
        tokens.push({ type: 'LPAREN', value: '(', position: i });
        break;
      case ')':
        tokens.push({ type: 'RPAREN', value: ')', position: i });
        break;
      default:
        throw new Error(`Unexpected character '${char}' at index ${i}`);
    }
    i++;
  }

  tokens.push({ type: 'EOF', value: '', position: i });
  return tokens;
}
