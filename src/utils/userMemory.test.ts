import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMemorySystemPromptBlock,
  createStreamingMemoryFilter,
  extractExplicitMemoryFromUserPrompt,
  normalizeMemoryCategory,
  normalizeMemoryContent,
  parseMemoryDirectivesFromResponse
} from './userMemory.ts';

test('buildMemorySystemPromptBlock includes saved memories across categories and instructions', () => {
  const block = buildMemorySystemPromptBlock([
    {
      id: 'mem_1',
      user_id: 'u1',
      content: 'Always provide TypeScript examples without Express boilerplate',
      category: 'preference',
      source: 'manual',
      created_at: '2026-11-18T10:00:00Z',
      updated_at: '2026-11-18T10:00:00Z'
    },
    {
      id: 'mem_2',
      user_id: 'u1',
      content: 'Based in Dhaka building a B2B logistics startup',
      category: 'profile',
      source: 'auto',
      created_at: '2026-11-18T10:00:00Z',
      updated_at: '2026-11-18T10:00:00Z'
    }
  ]);

  assert.match(block, /\[User Persistent Memory/);
  assert.match(block, /\[Preference\] Always provide TypeScript examples/);
  assert.match(block, /\[Profile\] Based in Dhaka building a B2B logistics startup/);
  assert.match(block, /\[\[MEMORY:category\|concise standalone fact\]\]/);
});

test('parseMemoryDirectivesFromResponse strips [[MEMORY:...]] markers and deduplicates facts', () => {
  const raw = `Got it! I will tailor all future responses accordingly.

[[MEMORY:preference|Prefers concise Bengali explanations with English technical terms]]
[[MEMORY:preference|Prefers concise Bengali explanations with English technical terms]]
[[MEMORY:profile|Senior React developer from Chattogram]]`;

  const parsed = parseMemoryDirectivesFromResponse(raw);
  assert.equal(parsed.visibleText, 'Got it! I will tailor all future responses accordingly.');
  assert.equal(parsed.extractedMemories.length, 2);
  assert.deepEqual(parsed.extractedMemories[0], {
    category: 'preference',
    content: 'Prefers concise Bengali explanations with English technical terms'
  });
  assert.deepEqual(parsed.extractedMemories[1], {
    category: 'profile',
    content: 'Senior React developer from Chattogram'
  });
});

test('createStreamingMemoryFilter strips split [[MEMORY:...]] directives seamlessly across chunks', () => {
  const filter = createStreamingMemoryFilter();
  const chunks = [
    'Sure, noted! ',
    'I will keep that ',
    'in mind. [',
    '[MEMORY:instruction|Use ',
    'Bangladeshi Taka (BDT) for pricing tables]',
    ']\nHave a great day!'
  ];

  let visible = '';
  for (const chunk of chunks) {
    visible += filter.push(chunk);
  }
  const flushed = filter.flush();
  visible += flushed.remainingText;

  assert.equal(visible, 'Sure, noted! I will keep that in mind. \nHave a great day!');
  assert.equal(flushed.extractedMemories.length, 1);
  assert.deepEqual(flushed.extractedMemories[0], {
    category: 'instruction',
    content: 'Use Bangladeshi Taka (BDT) for pricing tables'
  });
});

test('extractExplicitMemoryFromUserPrompt captures English and Bengali explicit memory requests', () => {
  const en1 = extractExplicitMemoryFromUserPrompt('Remember that I am a freelance SaaS designer in Dhaka.');
  assert.equal(en1.length, 1);
  assert.equal(en1[0].category, 'instruction');
  assert.equal(en1[0].content, 'I am a freelance SaaS designer in Dhaka');

  const en2 = extractExplicitMemoryFromUserPrompt('Always reply in bullet points with clear headings');
  assert.equal(en2.length, 1);
  assert.equal(en2[0].category, 'preference');
  assert.match(en2[0].content, /^Always reply in bullet points/);

  const bn = extractExplicitMemoryFromUserPrompt('মনে রেখো আমি বাংলায় সংক্ষিপ্ত উত্তর পছন্দ করি');
  assert.equal(bn.length, 1);
  assert.match(bn[0].content, /বাংলায় সংক্ষিপ্ত উত্তর/);

  const normalQuestion = extractExplicitMemoryFromUserPrompt('What is the capital of Bangladesh?');
  assert.equal(normalQuestion.length, 0);
});

test('normalizeMemoryCategory and normalizeMemoryContent enforce safe defaults and length caps', () => {
  assert.equal(normalizeMemoryCategory('PREFERENCE'), 'preference');
  assert.equal(normalizeMemoryCategory('unknown_type'), 'context');
  assert.equal(normalizeMemoryContent('   hello   \n  world  '), 'hello world');
});
