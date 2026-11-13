export type TokenType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'function'
  | 'type'
  | 'number'
  | 'operator'
  | 'punctuation'
  | 'plain';

export interface CodeToken {
  type: TokenType;
  value: string;
}

const KEYWORDS = new Set([
  'export',
  'import',
  'from',
  'function',
  'const',
  'let',
  'var',
  'return',
  'async',
  'await',
  'try',
  'catch',
  'finally',
  'if',
  'else',
  'for',
  'while',
  'new',
  'true',
  'false',
  'null',
  'undefined',
  'type',
  'interface',
  'as',
  'typeof'
]);

const BUILTIN_TYPES = new Set([
  'Promise',
  'AbortSignal',
  'AbortController',
  'Record',
  'Array',
  'Partial',
  'ReturnType',
  'T'
]);

/**
 * Tokenizes a single line of TypeScript/JavaScript code for IDE-style syntax highlighting.
 */
export function tokenizeCodeLine(line: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let i = 0;

  while (i < line.length) {
    // Line comment
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ type: 'comment', value: line.slice(i) });
      break;
    }

    // String literals (', ", `)
    if (line[i] === "'" || line[i] === '"' || line[i] === '`') {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\') {
          j += 2;
          continue;
        }
        if (line[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      tokens.push({ type: 'string', value: line.slice(i, j) });
      i = j;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(line[i]) && (i === 0 || !/[A-Za-z0-9_$]/.test(line[i - 1]))) {
      let j = i + 1;
      while (j < line.length && /[0-9._]/.test(line[j])) j++;
      tokens.push({ type: 'number', value: line.slice(i, j) });
      i = j;
      continue;
    }

    // Identifiers, keywords, types, functions
    if (/[A-Za-z_$]/.test(line[i])) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      const nextNonSpace = line.slice(j).match(/^\s*(.)/)?.[1];

      if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (BUILTIN_TYPES.has(word) || (/^[A-Z][A-Za-z0-9]*$/.test(word) && nextNonSpace !== '(')) {
        tokens.push({ type: 'type', value: word });
      } else if (nextNonSpace === '(' || nextNonSpace === '<') {
        tokens.push({ type: 'function', value: word });
      } else {
        tokens.push({ type: 'plain', value: word });
      }
      i = j;
      continue;
    }

    // Multi-char & single-char operators
    if (/[=<>!&|?:+\-*/]/.test(line[i])) {
      let j = i + 1;
      while (j < line.length && /[=<>!&|?:+\-*/]/.test(line[j])) j++;
      tokens.push({ type: 'operator', value: line.slice(i, j) });
      i = j;
      continue;
    }

    // Punctuation
    if (/[(){}\[\].,;]/.test(line[i])) {
      tokens.push({ type: 'punctuation', value: line[i] });
      i++;
      continue;
    }

    // Whitespace or any other character
    let j = i + 1;
    while (j < line.length && /[^A-Za-z0-9_$'"`/=<>!&|?:+\-*(){}\[\].,;]/.test(line[j])) {
      j++;
    }
    tokens.push({ type: 'plain', value: line.slice(i, j) });
    i = j;
  }

  return tokens;
}
