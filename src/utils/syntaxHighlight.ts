export type TokenType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'function'
  | 'type'
  | 'number'
  | 'operator'
  | 'punctuation'
  | 'property'
  | 'plain';

export interface CodeToken {
  type: TokenType;
  value: string;
}

const KEYWORDS = new Set([
  // JS / TS
  'export',
  'import',
  'from',
  'default',
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
  'throw',
  'if',
  'else',
  'elif',
  'switch',
  'case',
  'break',
  'continue',
  'for',
  'while',
  'do',
  'in',
  'of',
  'new',
  'true',
  'false',
  'null',
  'undefined',
  'type',
  'interface',
  'enum',
  'implements',
  'extends',
  'class',
  'public',
  'private',
  'protected',
  'readonly',
  'as',
  'typeof',
  'keyof',
  'void',
  // Python
  'def',
  'lambda',
  'with',
  'yield',
  'pass',
  'raise',
  'except',
  'None',
  'True',
  'False',
  'and',
  'or',
  'not',
  'is',
  'global',
  'nonlocal',
  // Go / Rust / Java / C++
  'package',
  'func',
  'struct',
  'fn',
  'pub',
  'impl',
  'mut',
  'match',
  'use',
  'mod',
  'static',
  'final',
  // SQL
  'SELECT',
  'FROM',
  'WHERE',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'CREATE',
  'TABLE',
  'ALTER',
  'DROP',
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'ON',
  'GROUP',
  'BY',
  'ORDER',
  'LIMIT',
  'AS',
  'AND',
  'OR',
  'NOT',
  'NULL',
  'select',
  'from',
  'where',
  'insert',
  'into',
  'values',
  'update',
  'set',
  'delete',
  'create',
  'table',
  'join',
  'order',
  'group',
  'limit',
  // Bash / CLI
  'echo',
  'export',
  'sudo',
  'chmod',
  'mkdir',
  'curl',
  'git',
  'npm',
  'npx',
  'yarn',
  'pnpm',
  'cd',
  'ls',
  'cat',
  'grep',
  'then',
  'fi',
  'done'
]);

const BUILTIN_TYPES = new Set([
  'Promise',
  'AbortSignal',
  'AbortController',
  'Record',
  'Array',
  'Partial',
  'Required',
  'Pick',
  'Omit',
  'ReturnType',
  'React',
  'FC',
  'HTMLElement',
  'Response',
  'Request',
  'Error',
  'Map',
  'Set',
  'Date',
  'JSON',
  'Math',
  'console',
  'window',
  'document',
  'string',
  'number',
  'boolean',
  'unknown',
  'any',
  'never',
  'int',
  'float',
  'str',
  'bool',
  'dict',
  'list',
  'tuple',
  'T',
  'K',
  'V',
  'VARCHAR',
  'INT',
  'TEXT',
  'BOOLEAN',
  'TIMESTAMP'
]);

function usesHashComments(lang?: string): boolean {
  if (!lang) return true;
  const l = lang.toLowerCase();
  return [
    'py',
    'python',
    'sh',
    'bash',
    'zsh',
    'shell',
    'yaml',
    'yml',
    'toml',
    'env',
    'dockerfile',
    'ruby',
    'rb',
    'r',
    'perl'
  ].includes(l);
}

function usesDashComments(lang?: string): boolean {
  if (!lang) return false;
  const l = lang.toLowerCase();
  return ['sql', 'postgres', 'postgresql', 'mysql', 'sqlite', 'lua', 'haskell'].includes(l);
}

/**
 * Tokenizes a single line of code for IDE-style syntax highlighting across
 * TypeScript/JavaScript, Python, Bash, SQL, HTML/JSX, CSS, JSON, Go, and Rust.
 */
export function tokenizeCodeLine(line: string, language?: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let i = 0;

  while (i < line.length) {
    // Double-slash line comment (JS/TS/Go/Rust/CSS/C)
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ type: 'comment', value: line.slice(i) });
      break;
    }

    // Block comment fragment /* ... */
    if (line[i] === '/' && line[i + 1] === '*') {
      const endIdx = line.indexOf('*/', i + 2);
      const sliceEnd = endIdx === -1 ? line.length : endIdx + 2;
      tokens.push({ type: 'comment', value: line.slice(i, sliceEnd) });
      i = sliceEnd;
      continue;
    }

    // Hash line comment (# in Python, Bash, YAML, etc.)
    if (line[i] === '#' && usesHashComments(language)) {
      tokens.push({ type: 'comment', value: line.slice(i) });
      break;
    }

    // SQL double-dash comment
    if (line[i] === '-' && line[i + 1] === '-' && usesDashComments(language)) {
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
      const literal = line.slice(i, j);
      const afterLiteral = line.slice(j).match(/^\s*(.)/)?.[1];
      // JSON / Object quoted keys ("key": ...)
      if ((quote === '"' || quote === "'") && afterLiteral === ':') {
        tokens.push({ type: 'property', value: literal });
      } else {
        tokens.push({ type: 'string', value: literal });
      }
      i = j;
      continue;
    }

    // Numbers (integers, decimals, hex colors in CSS/HTML like #181A20)
    if (line[i] === '#' && /[0-9A-Fa-f]{3,8}/.test(line.slice(i + 1))) {
      let j = i + 1;
      while (j < line.length && /[0-9A-Fa-f]/.test(line[j])) j++;
      tokens.push({ type: 'number', value: line.slice(i, j) });
      i = j;
      continue;
    }

    if (/[0-9]/.test(line[i]) && (i === 0 || !/[A-Za-z0-9_$]/.test(line[i - 1]))) {
      let j = i + 1;
      while (j < line.length && /[0-9._xXa-fA-F]/.test(line[j])) j++;
      tokens.push({ type: 'number', value: line.slice(i, j) });
      i = j;
      continue;
    }

    // Identifiers, keywords, types, properties, functions
    if (/[A-Za-z_$@]/.test(line[i])) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_$-]/.test(line[j])) j++;
      const word = line.slice(i, j);
      const nextNonSpace = line.slice(j).match(/^\s*(.)/)?.[1];
      const prevChar = i > 0 ? line[i - 1] : '';

      if (word.startsWith('@')) {
        tokens.push({ type: 'keyword', value: word });
      } else if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (
        BUILTIN_TYPES.has(word) ||
        (/^[A-Z][A-Za-z0-9]*$/.test(word) && nextNonSpace !== '(')
      ) {
        tokens.push({ type: 'type', value: word });
      } else if (nextNonSpace === '(' || nextNonSpace === '<') {
        tokens.push({ type: 'function', value: word });
      } else if (
        prevChar === '<' ||
        (i > 1 && line[i - 2] === '<' && line[i - 1] === '/')
      ) {
        tokens.push({ type: 'type', value: word });
      } else if (nextNonSpace === ':' && prevChar !== ':') {
        tokens.push({ type: 'property', value: word });
      } else {
        tokens.push({ type: 'plain', value: word });
      }
      i = j;
      continue;
    }

    // Multi-char & single-char operators
    if (/[=<>!&|?:+\-*/%]/.test(line[i])) {
      let j = i + 1;
      while (j < line.length && /[=<>!&|?:+\-*/%]/.test(line[j])) j++;
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
    while (j < line.length && /[^A-Za-z0-9_$@'"`#/=<>!&|?:+\-*(){}\[\].,;%]/.test(line[j])) {
      j++;
    }
    tokens.push({ type: 'plain', value: line.slice(i, j) });
    i = j;
  }

  return tokens;
}
