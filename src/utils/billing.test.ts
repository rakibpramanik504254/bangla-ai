import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBDT,
  isSubscriptionActive,
  calculateExpiryDate,
  calculateUsageStats,
  estimateTokens,
  PLANS
} from './billing.ts';

test('formatBDT formats amounts with BDT currency symbol and comma separators', () => {
  assert.equal(formatBDT(1299), '৳1,299');
  assert.equal(formatBDT(9999), '৳9,999');
  assert.equal(formatBDT(50000), '৳50,000');
});

test('isSubscriptionActive properly validates subscription status and expiry', () => {
  assert.equal(isSubscriptionActive(null), false);
  assert.equal(isSubscriptionActive(undefined), false);

  // Expired in past
  const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
  assert.equal(isSubscriptionActive({ status: 'active', expires_at: pastDate }), false);

  // Future active
  const futureDate = new Date(Date.now() + 86400 * 1000 * 10).toISOString();
  assert.equal(isSubscriptionActive({ status: 'active', expires_at: futureDate }), true);

  // Inactive status even if date in future
  assert.equal(isSubscriptionActive({ status: 'cancelled', expires_at: futureDate }), false);
  assert.equal(isSubscriptionActive({ status: 'expired', expires_at: futureDate }), false);
});

test('calculateExpiryDate calculates 30 days for monthly and 365 days for yearly', () => {
  const now = Date.now();
  const monthlyExpiry = calculateExpiryDate('monthly');
  const daysMonthly = Math.round((monthlyExpiry.getTime() - now) / (1000 * 60 * 60 * 24));
  assert.equal(daysMonthly, 30);

  const yearlyExpiry = calculateExpiryDate('yearly');
  const daysYearly = Math.round((yearlyExpiry.getTime() - now) / (1000 * 60 * 60 * 24));
  assert.equal(daysYearly, 365);
});

test('calculateUsageStats calculates remaining tokens and limits properly', () => {
  const stats = calculateUsageStats(50000, 12500);
  assert.equal(stats.limit, 50000);
  assert.equal(stats.used, 12500);
  assert.equal(stats.remaining, 37500);
  assert.equal(stats.percentage, 25);
  assert.equal(stats.isLimitReached, false);

  const limitReached = calculateUsageStats(50000, 50000);
  assert.equal(limitReached.isLimitReached, true);
  assert.equal(limitReached.remaining, 0);
  assert.equal(limitReached.percentage, 100);
});

test('estimateTokens calculates realistic token approximations', () => {
  const prompt = 'How do I build an AI application with Node.js?';
  const tokens = estimateTokens(prompt, 'Here is a step-by-step tutorial:');
  assert.ok(tokens.promptTokens > 0);
  assert.ok(tokens.completionTokens > 0);
  assert.equal(tokens.totalTokens, tokens.promptTokens + tokens.completionTokens);
});

test('PLANS contains exact specified pricing for Bangladesh market', () => {
  assert.equal(PLANS.monthly.priceBDT, 1299);
  assert.equal(PLANS.yearly.priceBDT, 9999);
  assert.equal(PLANS.monthly.name, 'Monthly Plan');
  assert.equal(PLANS.yearly.name, 'Yearly Plan');
});
