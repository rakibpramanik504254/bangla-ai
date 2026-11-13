import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMarkdownBlocks,
  parseInlineSegments,
  getFileExtensionForLanguage,
  estimateReadingStats
} from './markdownBlocks.ts';

test('parseMarkdownBlocks parses complete and streaming unclosed code fences', () => {
  const md = [
    'Here is TypeScript:',
    '```typescript',
    'const x = 42;',
    'console.log(x);',
    '```',
    '',
    'And Python streaming:',
    '```python',
    'def hello():'
  ].join('\n');

  const blocks = parseMarkdownBlocks(md);
  assert.equal(blocks.length, 4);
  assert.deepEqual(blocks[0], { type: 'paragraph', text: 'Here is TypeScript:' });
  assert.deepEqual(blocks[1], {
    type: 'code',
    language: 'typescript',
    code: 'const x = 42;\nconsole.log(x);',
    isStreaming: false
  });
  assert.deepEqual(blocks[2], { type: 'paragraph', text: 'And Python streaming:' });
  assert.deepEqual(blocks[3], {
    type: 'code',
    language: 'python',
    code: 'def hello():',
    isStreaming: true
  });
});

test('parseMarkdownBlocks parses tables, headings, lists, blockquotes, and hr', () => {
  const md = [
    '## Model Comparison',
    '> Fast local routing',
    '',
    '| Model | Context |',
    '| --- | --- |',
    '| Claude | 500k |',
    '| Gemini | 2M |',
    '',
    '- First item',
    '- Second item',
    '---'
  ].join('\n');

  const blocks = parseMarkdownBlocks(md);
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[1].type, 'blockquote');
  assert.deepEqual(blocks[2], {
    type: 'table',
    headers: ['Model', 'Context'],
    rows: [
      ['Claude', '500k'],
      ['Gemini', '2M']
    ]
  });
  assert.deepEqual(blocks[3], {
    type: 'list',
    ordered: false,
    items: ['First item', 'Second item']
  });
  assert.deepEqual(blocks[4], { type: 'hr' });
});

test('parseInlineSegments extracts inline code, bold, italic, and links cleanly', () => {
  const segs = parseInlineSegments(
    'Use `useEffect` with **Bangla AI** or visit [OpenRouter](https://openrouter.ai) *now*.'
  );
  assert.equal(segs.find((s) => s.type === 'code')?.value, 'useEffect');
  assert.equal(segs.find((s) => s.type === 'bold')?.value, 'Bangla AI');
  assert.deepEqual(segs.find((s) => s.type === 'link'), {
    type: 'link',
    label: 'OpenRouter',
    href: 'https://openrouter.ai'
  });
  assert.equal(segs.find((s) => s.type === 'italic')?.value, 'now');
});

test('getFileExtensionForLanguage & estimateReadingStats work accurately', () => {
  assert.equal(getFileExtensionForLanguage('typescript'), 'ts');
  assert.equal(getFileExtensionForLanguage('py'), 'py');
  assert.equal(getFileExtensionForLanguage('unknownlang'), 'txt');
  assert.deepEqual(estimateReadingStats('Hello Bangla AI\nSecond line'), {
    words: 5,
    lines: 2
  });
});
