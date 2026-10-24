import { MathParseError } from './errors';
import { Token } from './types';

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const char = input[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (/\d/.test(char) || (char === '.' && i + 1 < len && /\d/.test(input[i + 1]))) {
      const startPos = i;
      let numStr = '';
      let seenDot = false;
      while (i < len) {
        const current = input[i];
        if (/\d/.test(current)) {
          numStr += current;
          i++;
          continue;
        }
        if (current === '.') {
          if (seenDot) {
            throw new MathParseError('Invalid number literal', i);
          }
          seenDot = true;
          numStr += current;
          i++;
          continue;
        }
        break;
      }
      if (numStr === '.' || numStr === '') {
        throw new MathParseError('Invalid number literal', startPos);
      }
      tokens.push({ type: 'NUMBER', value: numStr, position: startPos });
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      const startPos = i;
      let name = '';
      while (i < len && /[a-zA-Z]/.test(input[i])) {
        name += input[i];
        i++;
      }
      tokens.push({ type: 'IDENTIFIER', value: name, position: startPos });
      continue;
    }

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
      case '!':
        tokens.push({ type: 'FACTORIAL', value: '!', position: i });
        break;
      case '%':
        tokens.push({ type: 'PERCENT', value: '%', position: i });
        break;
      case '=':
        tokens.push({ type: 'EQUALS', value: '=', position: i });
        break;
      case ',':
        tokens.push({ type: 'COMMA', value: ',', position: i });
        break;
      case ';':
        tokens.push({ type: 'SEMICOLON', value: ';', position: i });
        break;
      case '|':
        tokens.push({ type: 'PIPE', value: '|', position: i });
        break;
      case '(':
        tokens.push({ type: 'LPAREN', value: '(', position: i });
        break;
      case ')':
        tokens.push({ type: 'RPAREN', value: ')', position: i });
        break;
      default:
        throw new MathParseError(`Unexpected character '${char}' at index ${i}`, i);
    }
    i++;
  }

  tokens.push({ type: 'EOF', value: '', position: i });
  return tokens;
}
