import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeCodeLine } from './syntaxHighlight.ts';

test('tokenizeCodeLine classifies keywords, functions, types, numbers, and strings accurately', () => {
  const tokens = tokenizeCodeLine(
    "export function useDebouncedSearch<T>(query: string, delay = 300) { // fast hook"
  );

  const byValue = (val: string) => tokens.find((t) => t.value === val)?.type;

  assert.equal(byValue('export'), 'keyword');
  assert.equal(byValue('function'), 'keyword');
  assert.equal(byValue('useDebouncedSearch'), 'function');
  assert.equal(byValue('T'), 'type');
  assert.equal(byValue('300'), 'number');

  const comment = tokens.find((t) => t.type === 'comment');
  assert.equal(comment?.value, '// fast hook');
});

test('tokenizeCodeLine keeps string literals intact without splitting keywords inside quotes', () => {
  const tokens = tokenizeCodeLine("if (err.name !== 'AbortError') console.error(err);");
  const str = tokens.find((t) => t.type === 'string');
  assert.equal(str?.value, "'AbortError'");
  assert.equal(tokens.find((t) => t.value === 'if')?.type, 'keyword');
  assert.equal(tokens.find((t) => t.value === 'error')?.type, 'function');
});

test('tokenizeCodeLine supports Python, SQL, and JSON property highlighting', () => {
  const pyTokens = tokenizeCodeLine("def greet(name): # greeting", "python");
  assert.equal(pyTokens.find((t) => t.value === 'def')?.type, 'keyword');
  assert.equal(pyTokens.find((t) => t.value === 'greet')?.type, 'function');
  assert.equal(pyTokens.find((t) => t.type === 'comment')?.value, '# greeting');

  const sqlTokens = tokenizeCodeLine("SELECT id FROM users WHERE active = true -- filter", "sql");
  assert.equal(sqlTokens.find((t) => t.value === 'SELECT')?.type, 'keyword');
  assert.equal(sqlTokens.find((t) => t.value === 'FROM')?.type, 'keyword');
  assert.equal(sqlTokens.find((t) => t.type === 'comment')?.value, '-- filter');

  const jsonTokens = tokenizeCodeLine('  "model": "claude-sonnet-4",', 'json');
  assert.equal(jsonTokens.find((t) => t.value === '"model"')?.type, 'property');
  assert.equal(jsonTokens.find((t) => t.value === '"claude-sonnet-4"')?.type, 'string');
});
