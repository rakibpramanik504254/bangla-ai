import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  buildMetaCapiAddPaymentInfoPayload,
  buildMetaCapiPurchasePayload,
  buildPurchaseEventId,
  extractClientIpFromRequest,
  extractNamePartsForMeta,
  normalizeBdPhoneForMeta,
  normalizeEmailForMeta,
} from './metaCapi.ts';

const sha256 = (val: string) => crypto.createHash('sha256').update(val).digest('hex');

test('normalizeEmailForMeta lowercases real emails and rejects synthetic phone placeholders', () => {
  assert.equal(normalizeEmailForMeta('  Rakib.Hasan@Gmail.com  '), 'rakib.hasan@gmail.com');
  assert.equal(normalizeEmailForMeta('01712345678@phone.bangla-ai.pro'), undefined);
  assert.equal(normalizeEmailForMeta(''), undefined);
  assert.equal(normalizeEmailForMeta('not-an-email'), undefined);
});

test('normalizeBdPhoneForMeta converts all Bangladeshi phone formats to 8801XXXXXXXXX', () => {
  assert.equal(normalizeBdPhoneForMeta('01878242764'), '8801878242764');
  assert.equal(normalizeBdPhoneForMeta('+880 1878-242764'), '8801878242764');
  assert.equal(normalizeBdPhoneForMeta('8801878242764'), '8801878242764');
  assert.equal(normalizeBdPhoneForMeta('008801878242764'), '8801878242764');
  assert.equal(normalizeBdPhoneForMeta('1878242764'), '8801878242764');
  assert.equal(normalizeBdPhoneForMeta('+880 01878242764'), '8801878242764');
  assert.equal(normalizeBdPhoneForMeta(''), undefined);
});

test('extractNamePartsForMeta parses real names and ignores synthetic placeholders', () => {
  assert.deepEqual(extractNamePartsForMeta('  Rakibul Islam Khan '), { fn: 'rakibul', ln: 'khan' });
  assert.deepEqual(extractNamePartsForMeta('Tanvir'), { fn: 'tanvir' });
  assert.deepEqual(extractNamePartsForMeta('User 2764'), {});
  assert.deepEqual(extractNamePartsForMeta('Customer'), {});
  assert.deepEqual(extractNamePartsForMeta('01878242764'), {});
});

test('extractClientIpFromRequest prefers proxy headers and strips IPv4-mapped IPv6 prefix', () => {
  assert.equal(
    extractClientIpFromRequest({ 'x-forwarded-for': '103.111.222.33, 10.0.0.1' }, '::ffff:127.0.0.1'),
    '103.111.222.33'
  );
  assert.equal(
    extractClientIpFromRequest({ 'cf-connecting-ip': '203.76.100.5' }, '127.0.0.1'),
    '203.76.100.5'
  );
  assert.equal(extractClientIpFromRequest({}, '::ffff:103.55.44.33'), '103.55.44.33');
});

test('buildMetaCapiPurchasePayload sends hashed PII, unhashed checkout signals, and deterministic event_id', () => {
  const { eventId, payload } = buildMetaCapiPurchasePayload({
    payment: {
      id: 'pay_abc12345',
      user_id: 'usr_9988',
      plan_id: 'monthly',
      plan_name: 'Monthly Plan (৳699)',
      amount: 699,
      trx_id: 'BKX9988776',
      gateway: 'bkash',
      sender_number: '01878242764',
      meta_fbp: 'fb.1.1731000000000.1234567890',
      meta_fbc: 'fb.1.1731000000000.IwAR0TestClickId',
      meta_client_ip: '103.111.222.33',
      meta_client_user_agent: 'Mozilla/5.0 (Linux; Android 14) Chrome/129.0',
      meta_event_source_url: 'https://bangla-ai.pro/offer',
    },
    user: {
      id: 'usr_9988',
      email: ' Customer@Example.COM ',
      name: 'Arifur Rahman',
      phone: '01878242764',
    },
    testEventCode: 'TEST12345',
    eventTimeSec: 1732000000,
  });

  assert.equal(eventId, buildPurchaseEventId({ id: 'pay_abc12345' }));
  assert.equal(payload.test_event_code, 'TEST12345');

  const evt = payload.data[0];
  assert.equal(evt.event_name, 'Purchase');
  assert.equal(evt.event_id, 'purchase_pay_abc12345');
  assert.equal(evt.event_time, 1732000000);
  assert.equal(evt.event_source_url, 'https://bangla-ai.pro/offer');
  assert.equal(evt.action_source, 'website');

  // Hashed PII fields
  assert.deepEqual(evt.user_data.em, [sha256('customer@example.com')]);
  assert.deepEqual(evt.user_data.ph, [sha256('8801878242764')]);
  assert.deepEqual(evt.user_data.fn, [sha256('arifur')]);
  assert.deepEqual(evt.user_data.ln, [sha256('rahman')]);
  assert.deepEqual(evt.user_data.country, [sha256('bd')]);
  assert.deepEqual(evt.user_data.external_id, [sha256('usr_9988')]);

  // Unhashed customer checkout signals
  assert.equal(evt.user_data.client_ip_address, '103.111.222.33');
  assert.equal(evt.user_data.client_user_agent, 'Mozilla/5.0 (Linux; Android 14) Chrome/129.0');
  assert.equal(evt.user_data.fbp, 'fb.1.1731000000000.1234567890');
  assert.equal(evt.user_data.fbc, 'fb.1.1731000000000.IwAR0TestClickId');
});

test('buildMetaCapiPurchasePayload omits synthetic guest email & placeholder name', () => {
  const { payload } = buildMetaCapiPurchasePayload({
    payment: {
      id: 'pay_guest1',
      user_id: 'usr_guest1',
      plan_id: 'yearly',
      amount: 5999,
      trx_id: 'NGD123456',
      gateway: 'nagad',
      sender_number: '01712345678',
    },
    user: {
      id: 'usr_guest1',
      email: '01712345678@phone.bangla-ai.pro',
      name: 'User 5678',
      phone: '01712345678',
    },
  });

  const userData = payload.data[0].user_data;
  assert.equal(userData.em, undefined);
  assert.equal(userData.fn, undefined);
  assert.equal(userData.ln, undefined);
  assert.deepEqual(userData.ph, [sha256('8801712345678')]);
});

test('buildMetaCapiAddPaymentInfoPayload preserves shared browser/server event_id', () => {
  const { eventId, payload } = buildMetaCapiAddPaymentInfoPayload({
    payment: {
      id: 'pay_api1',
      user_id: 'usr_1',
      plan_id: 'monthly',
      amount: 699,
      trx_id: 'TRX999111',
      gateway: 'bkash',
      sender_number: '01878242764',
    },
    eventId: 'add_payment_info_shared_123',
  });

  assert.equal(eventId, 'add_payment_info_shared_123');
  assert.equal(payload.data[0].event_name, 'AddPaymentInfo');
  assert.equal(payload.data[0].event_id, 'add_payment_info_shared_123');
});

test('buildMetaCapiPurchasePayload omits test_event_code for live orders and keeps deterministic event_id', () => {
  const first = buildMetaCapiPurchasePayload({
    payment: {
      id: 'pay_live_001',
      user_id: 'usr_live_1',
      plan_id: 'monthly',
      amount: 699,
      trx_id: 'DKL1QY9H2D',
      gateway: 'bkash',
      sender_number: '01715005808',
    },
  });
  const second = buildMetaCapiPurchasePayload({
    payment: {
      id: 'pay_live_001',
      user_id: 'usr_live_1',
      plan_id: 'monthly',
      amount: 699,
      trx_id: 'DKL1QY9H2D',
      gateway: 'bkash',
      sender_number: '01715005808',
    },
  });

  assert.equal(first.payload.test_event_code, undefined);
  assert.equal(first.eventId, second.eventId);
  assert.equal(first.eventId, 'purchase_pay_live_001');
});
