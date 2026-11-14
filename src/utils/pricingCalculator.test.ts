import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  COMPARISON_AI_TOOLS,
  COMPARISON_FEATURES,
  DEFAULT_SELECTED_TOOL_IDS,
  calculateTodayCostSummary,
  getComparisonPlanInfo,
  getPlanFeatures,
  toggleToolSelection,
} from './pricingCalculator.ts';

test('all comparison AI tools reference valid asset files on disk', () => {
  assert.equal(COMPARISON_AI_TOOLS.length, 8);
  for (const tool of COMPARISON_AI_TOOLS) {
    assert.ok(tool.monthlyBDT > 0);
    assert.ok(tool.iconSrc.startsWith('/assets/aistudio/'));
    const diskPath = path.resolve(process.cwd(), 'public', tool.iconSrc.replace(/^\//, ''));
    assert.equal(fs.existsSync(diskPath), true, `Missing comparison icon on disk: ${diskPath}`);
  }
});

test('default 4 selected tools sum to ৳11,000/month with exact breakdown labels', () => {
  assert.deepEqual(DEFAULT_SELECTED_TOOL_IDS, ['chatgpt', 'claude', 'gemini', 'grok']);
  const summary = calculateTodayCostSummary(DEFAULT_SELECTED_TOOL_IDS);

  assert.equal(summary.count, 4);
  assert.equal(summary.totalMonthlyBDT, 11000);
  assert.equal(summary.formattedTotalBDT, '৳11,000');
  assert.equal(summary.toolsBadgeLabel, '4 TOOLS');
  assert.equal(summary.loginsLabel, '4 separate logins · 4 bills to track');
});

test('toggleToolSelection updates count, total, and singular/empty states cleanly', () => {
  let active = toggleToolSelection(DEFAULT_SELECTED_TOOL_IDS, 'perplexity');
  let summary = calculateTodayCostSummary(active);
  assert.equal(summary.count, 5);
  assert.equal(summary.totalMonthlyBDT, 13500);
  assert.equal(summary.toolsBadgeLabel, '5 TOOLS');

  active = toggleToolSelection(['chatgpt'], 'perplexity');
  active = toggleToolSelection(active, 'perplexity');
  summary = calculateTodayCostSummary(active);
  assert.equal(summary.count, 1);
  assert.equal(summary.toolsBadgeLabel, '1 TOOL');
  assert.equal(summary.loginsLabel, '1 separate login · 1 bill to track');

  const empty = calculateTodayCostSummary([]);
  assert.equal(empty.count, 0);
  assert.equal(empty.totalMonthlyBDT, 0);
  assert.equal(empty.formattedTotalBDT, '৳0');
  assert.equal(empty.toolsBadgeLabel, '0 TOOLS');
  assert.equal(empty.loginsLabel, '0 separate logins · 0 bills to track');
});

test('getComparisonPlanInfo and getPlanFeatures return exact Monthly vs Yearly specs without banned promo copy', () => {
  const plan = getComparisonPlanInfo();
  assert.equal(plan.monthlyPriceBDT, 699);
  assert.equal(plan.monthlyAnnualizedBDT, 8388);
  assert.equal(plan.yearlyPriceBDT, 5999);
  assert.equal(plan.yearlyEquivalentMonthlyBDT, 500);
  assert.equal(plan.yearlySavingsBDT, 2389);

  const monthlyFeatures = getPlanFeatures('monthly');
  const yearlyFeatures = getPlanFeatures('yearly');

  assert.equal(COMPARISON_FEATURES.length, 6);
  assert.deepEqual(monthlyFeatures, [
    'Full access to top AI models (Claude Fable 5.2 (max), Gemini 4 Carbon (high), GPT-6 Astra (max), Grok 4.7 (xhigh))',
    'High-speed streaming responses with priority queuing',
    '1,000,000 (1M) token quota per monthly billing cycle',
    'Persistent chat history & session management',
    'Instant local payment via bKash, Nagad & Rocket',
    '24/7 technical customer support',
  ]);
  assert.deepEqual(yearlyFeatures, [
    'Everything in Monthly Plan included',
    'Save 28% annually (only ৳500/month equivalent)',
    '15,000,000 (15M) token quota per annual billing cycle',
    'Early access to newly released foundation models',
    'Dedicated high-throughput VIP server allocation',
    'Priority concierge & enterprise-grade support',
  ]);

  const combinedText = [...monthlyFeatures, ...yearlyFeatures].join(' ').toLowerCase();
  assert.equal(combinedText.includes('2x of everything'), false);
  assert.equal(combinedText.includes('free custom domain'), false);
});

