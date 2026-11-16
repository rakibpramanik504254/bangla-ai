import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCOUNT_NAV_GROUPS,
  ALL_ACCOUNT_NAV_ITEMS,
  computeAccountBillingCounts,
  filterAccountPayments,
  getAccountNavItem,
  getAccountSecurityChecklist,
} from './accountConsoleNav.ts';
import { Payment } from '../types/index.ts';

test('ACCOUNT_NAV_GROUPS defines structured Account Portal & Settings sections', () => {
  assert.equal(ACCOUNT_NAV_GROUPS.length, 2);
  assert.equal(ALL_ACCOUNT_NAV_ITEMS.length, 5);
  assert.equal(getAccountNavItem('overview').groupLabel, 'Account Portal');
  assert.equal(getAccountNavItem('security').groupLabel, 'Settings & Access');
  assert.equal(getAccountNavItem('billing').label, 'Billing History');
});

test('getAccountSecurityChecklist detects missing email, password, and Google link accurately', () => {
  const phoneOnly = getAccountSecurityChecklist({
    email: '01712345678@phone.bangla-ai.pro',
    needs_email: true,
    has_password: false,
    google_linked: false,
    firebase_uid: undefined,
  });
  assert.equal(phoneOnly.needsEmail, true);
  assert.equal(phoneOnly.hasPassword, false);
  assert.equal(phoneOnly.googleLinked, false);
  assert.equal(phoneOnly.missingCount, 3);
  assert.equal(phoneOnly.isComplete, false);

  const secured = getAccountSecurityChecklist({
    email: 'user@gmail.com',
    needs_email: false,
    has_password: true,
    google_linked: true,
    firebase_uid: 'fb_123',
  });
  assert.equal(secured.missingCount, 0);
  assert.equal(secured.isComplete, true);
  assert.equal(secured.statusLabel, 'Fully Secured');
});

test('computeAccountBillingCounts and filterAccountPayments filter by status and TrxID', () => {
  const samplePayments: Payment[] = [
    {
      id: 'p1',
      user_id: 'u1',
      plan_id: 'monthly',
      plan_name: 'Monthly Plan',
      amount: 699,
      currency: 'BDT',
      gateway: 'bkash',
      sender_number: '01700000001',
      trx_id: 'TRX_APP_01',
      status: 'completed',
      created_at: '2026-11-01T10:00:00Z',
    },
    {
      id: 'p2',
      user_id: 'u1',
      plan_id: 'yearly',
      plan_name: 'Yearly Plan',
      amount: 5999,
      currency: 'BDT',
      gateway: 'nagad',
      sender_number: '01800000002',
      trx_id: 'TRX_PEN_02',
      status: 'pending',
      created_at: '2026-11-10T10:00:00Z',
    },
    {
      id: 'p3',
      user_id: 'u1',
      plan_id: 'monthly',
      plan_name: 'Monthly Plan',
      amount: 699,
      currency: 'BDT',
      gateway: 'rocket',
      sender_number: '01900000003',
      trx_id: 'TRX_REJ_03',
      status: 'rejected',
      created_at: '2026-11-12T10:00:00Z',
    },
  ];

  const counts = computeAccountBillingCounts(samplePayments);
  assert.deepEqual(counts, { all: 3, approved: 1, pending: 1, rejected: 1 });

  assert.equal(filterAccountPayments(samplePayments, 'pending', '').length, 1);
  assert.equal(filterAccountPayments(samplePayments, 'all', 'nagad')[0].id, 'p2');
  assert.equal(filterAccountPayments(samplePayments, 'approved', 'TRX_APP')[0].id, 'p1');
  assert.equal(filterAccountPayments(samplePayments, 'rejected', 'wrong').length, 0);
});
