/**
 * MathLens Engine - Normalizer
 * FR-ME-01: Cleans variants, replaces multiplication/minus signs,
 * fixes common OCR misrecognitions, and expands implicit multiplication.
 */

export function normalizeMathExpression(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let s = raw.trim();

  // 1. Remove newlines and trim surrounding whitespace
  s = s.replace(/[\r\n]+/g, ' ').trim();

  // 2. Remove question marks commonly written at end of textbook/worksheet problems (e.g. "2+2=?" -> "2+2")
  s = s.replace(/=\s*\?/g, '');
  s = s.replace(/\?\s*=/g, '');
  s = s.replace(/\?/g, '');

  // 3. Remove stray leading or trailing OCR punctuation.
  s = s.replace(/^[_~:]+/g, '');
  s = s.replace(/[_~:]+$/g, '');

  // 3. OCR Operator Misrecognitions
  // Only replace 't' with '+' when strictly between two digits (e.g. 3 t 15 -> 3 + 15)
  // or when explicitly using the cross symbols (✝, †), preserving algebraic variable 't' (e.g. 5*t, v*t, t^2)
  s = s.replace(/(\d)\s*[tT]\s*(\d)/g, '$1+$2');
  s = s.replace(/([0-9a-zA-Z)])\s*[✝†]\s*([0-9a-zA-Z(])/g, '$1+$2');
  // Only replace colon if between symbols and no equals present
  if (!s.includes('=')) {
    s = s.replace(/([0-9a-zA-Z)])\s*[:]\s*([0-9a-zA-Z(])/g, '$1=$2');
  }
  // Underscore or tilde mistaken for minus
  s = s.replace(/[_~]/g, '-');
  // Common typo for equals sign: double minus '--' or '=='
  s = s.replace(/==/g, '=');

  // 3. Typographic unicode variants
  s = s.replace(/×/g, '*');
  s = s.replace(/÷/g, '/');
  s = s.replace(/[−–—]/g, '-');
  s = s.replace(/[·•]/g, '*');
  s = s.replace(/√\s*(\d+|\([^)Sync]+\))/g, 'sqrt($1)');
  s = s.replace(/√/g, 'sqrt');

  // 4. Common OCR alphanumeric confusion
  // Letter O/o next to digits or = -> 0
  s = s.replace(/(\d)[Oo]/g, '$10');
  s = s.replace(/[Oo](\d)/g, '0$1');
  s = s.replace(/=\s*[Oo]/g, '=0');

  // Letter l/I/| next to digits -> 1 (only if not an absolute value |...|)
  // If there's an even number of pipes or clear pipe pattern, do not destroy pipes
  const pipeCount = (s.match(/\|/g) || []).length;
  if (pipeCount % 2 !== 0) {
    s = s.replace(/(\d)[lI|]/g, '$11');
    s = s.replace(/[lI|](\d)/g, '1$1');
  } else {
    s = s.replace(/(\d)[lI]/g, '$11');
    s = s.replace(/[lI](\d)/g, '1$1');
  }

  // Letter S/s mistaken for 5 next to numbers or after operators
  s = s.replace(/([0-9])[Ss]/g, '$15');
  s = s.replace(/([+\-*/=])[Ss](\d)/g, '$15$2');

  // Letter Z/z mistaken for 2 next to operators or preceding variables
  s = s.replace(/([+\-*/=])[Zz](\d)/g, '$12$2');

  // B mistaken for 8 next to digits
  s = s.replace(/(\d)B/g, '$18');
  s = s.replace(/B(\d)/g, '8$1');

  // 5. Superscript numbers (², ³, ⁴, etc.)
  const superscriptMap: Record<string, string> = {
    '⁰': '^0',
    '¹': '^1',
    '²': '^2',
    '³': '^3',
    '⁴': '^4',
    '⁵': '^5',
    '⁶': '^6',
    '⁷': '^7',
    '⁸': '^8',
    '⁹': '^9',
  };
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (match) => superscriptMap[match] || match);

  // 6. If OCR produced "x2" instead of "x^2", normalize to "x^2".
  s = s.replace(/(^|[^a-zA-Z])([a-zA-Z])2(?=[+\-*/=)]|$)/g, '$1$2^2');

  // 7. Lowercase algebraic variables (X -> x, Y -> y, Z -> z) preserving function names
  s = s.replace(/\b(SQRT|ABS|SIN|COS|TAN|LOG|LN)\b/gi, (fn) => fn.toLowerCase());
  s = s.replace(/([0-9+\-*/=()^,]|^)([XYZ])([0-9+\-*/=()^,]|$)/g, (_, p1, p2, p3) => `${p1}${p2.toLowerCase()}${p3}`);

  // 8. Remove all internal whitespace around terms except comma/semicolon separation
  s = s.replace(/[ \t]+/g, '');

  // 9. Expand implicit multiplication:
  // e.g., 5sqrt(x) -> 5*sqrt(x), but not for function names like 'sqrt'
  s = s.replace(/(\d)(sqrt|abs|sin|cos|tan|log|ln)/gi, '$1*$2');
  s = s.replace(/(\d)([a-zA-Z(])/g, '$1*$2');

  // e.g., (x+1)(x-2) -> (x+1)*(x-2)
  s = s.replace(/(\))([a-zA-Z0-9(])/g, '$1*$2');

  // e.g., x(x+1) -> x*(x+1) when x is not a known function name
  s = s.replace(/\b([a-zA-Z]+)(\()/g, (match, p1, p2) => {
    const lower = p1.toLowerCase();
    if (['sqrt', 'abs', 'sin', 'cos', 'tan', 'log', 'ln'].includes(lower)) return match;
    return `${p1}*${p2}`;
  });

  // e.g., |x| to abs(x)
  s = s.replace(/\|([^|]+)\|/g, 'abs($1)');

  return s;
}

