import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPostLoginDestination,
  getDesktopNavItems,
  getAccountRoleLabel,
  getSubscriptionSummary,
  normalizePaymentStatus,
} from './navigation.ts';
import type { User } from '../types/index.ts';

test('getPostLoginDestination routes admins to admin console and customers to chat workspace', () => {
  assert.equal(getPostLoginDestination({ role: 'admin' }), 'admin');
  assert.equal(getPostLoginDestination({ role: 'user' }), 'chat');
  assert.equal(getPostLoginDestination(null), 'chat');
});

test('getDesktopNavItems exposes clean public links when logged out and role-aware links when logged in', () => {
  const loggedOut = getDesktopNavItems(null).map((item) => item.label);
  assert.deepEqual(loggedOut, ['Overview', 'Pricing', 'FAQ']);

  const customer = getDesktopNavItems({ role: 'user' }).map((item) => item.label);
  assert.deepEqual(customer, ['AI Workspace', 'Pricing', 'FAQ']);
  assert.equal(customer.includes('Admin Console'), false);

  const admin = getDesktopNavItems({ role: 'admin' }).map((item) => item.label);
  assert.deepEqual(admin, ['AI Workspace', 'Admin Console', 'Pricing', 'FAQ']);
});

test('getAccountRoleLabel distinguishes Owner & Admin, Pro Plan, and Free Tier', () => {
  assert.equal(getAccountRoleLabel({ role: 'admin', isSubscribed: true }), 'Owner & Admin');
  assert.equal(getAccountRoleLabel({ role: 'user', isSubscribed: true }), 'Pro Plan');
  assert.equal(getAccountRoleLabel({ role: 'user', isSubscribed: false }), 'Free Tier');
});

test('getSubscriptionSummary computes remaining tokens, usage percentage, and CTA label accurately', () => {
  const freeUser: User = {
    id: 'u1',
    name: 'Rakibul',
    email: 'unpaid@bangla.ai',
    phone: '01700000000',
    role: 'user',
    status: 'active',
    usage_limit: 0,
    current_usage: 0,
    isSubscribed: false,
    subscription: null,
  };

  const freeSummary = getSubscriptionSummary(freeUser);
  assert.equal(freeSummary.isActive, false);
  assert.equal(freeSummary.planLabel, 'Free Tier');
  assert.equal(freeSummary.remainingTokens, 0);
  assert.equal(freeSummary.usagePercent, 0);
  assert.equal(freeSummary.actionLabel, 'Upgrade Plan');

  const proUser: User = {
    id: 'u2',
    name: 'Subscriber',
    email: 'subscriber@bangla.ai',
    phone: '01711111111',
    role: 'user',
    status: 'active',
    usage_limit: 1_000_000,
    current_usage: 250_000,
    isSubscribed: true,
    subscription: {
      id: 'sub1',
      user_id: 'u2',
      plan_id: 'monthly',
      plan_name: 'Monthly Plan',
      amount: 699,
      currency: 'BDT',
      status: 'active',
      payment_method: 'bkash',
      trx_id: 'TRX999',
      started_at: '2026-11-01T00:00:00.000Z',
      expires_at: '2026-12-01T00:00:00.000Z',
      auto_renew: true,
    },
  };

  const proSummary = getSubscriptionSummary(proUser);
  assert.equal(proSummary.isActive, true);
  assert.equal(proSummary.planLabel, 'Monthly Plan');
  assert.equal(proSummary.remainingTokens, 750_000);
  assert.equal(proSummary.usagePercent, 25);
  assert.equal(proSummary.gatewayLabel, 'BKASH');
  assert.equal(proSummary.actionLabel, 'Upgrade / Renew Plan');
});

test('normalizePaymentStatus maps completed/pending/rejected to clean Approved/Pending/Rejected labels', () => {
  assert.deepEqual(normalizePaymentStatus('completed'), {
    label: 'Approved',
    variant: 'approved',
  });
  assert.deepEqual(normalizePaymentStatus('pending'), {
    label: 'Pending',
    variant: 'pending',
  });
  assert.deepEqual(normalizePaymentStatus('rejected'), {
    label: 'Rejected',
    variant: 'rejected',
  });
});
