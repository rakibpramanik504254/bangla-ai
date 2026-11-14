import test from 'node:test';
import assert from 'node:assert/strict';
import { FAQ_CATEGORIES, getFaqCategoryById } from './faqData.ts';

test('FAQ_CATEGORIES contains the 5 required categories and 27 total Q&As', () => {
  assert.deepEqual(
    FAQ_CATEGORIES.map((c) => c.label),
    ['Getting started', 'Models', 'Features', 'Plans & billing', 'Privacy & control']
  );
  assert.deepEqual(
    FAQ_CATEGORIES.map((c) => c.items.length),
    [4, 6, 6, 6, 5]
  );

  const totalCount = FAQ_CATEGORIES.reduce((sum, c) => sum + c.items.length, 0);
  assert.equal(totalCount, 27);
});

test('all FAQ items are non-empty, branded to Bangla-AI.pro, and contain zero third-party leaks', () => {
  for (const category of FAQ_CATEGORIES) {
    for (const item of category.items) {
      assert.ok(item.question.trim().length > 10, `Question too short in ${category.id}`);
      assert.ok(item.answer.trim().length > 20, `Answer too short in ${category.id}`);

      const combined = `${item.question} ${item.answer}`.toLowerCase();
      assert.equal(combined.includes('ai fiesta'), false, `Unexpected brand mention in ${category.id}`);
      assert.equal(combined.includes('lipika'), false, `Unexpected brand mention in ${category.id}`);
    }
  }
});

test('getFaqCategoryById returns matching category and safely falls back to first category', () => {
  assert.equal(getFaqCategoryById('models').label, 'Models');
  assert.equal(getFaqCategoryById('privacy-control').items.length, 5);
  assert.equal(getFaqCategoryById('unknown' as any).id, 'getting-started');
});
