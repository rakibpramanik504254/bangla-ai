import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendTelegramStatusLine,
  buildOrderInlineKeyboard,
  formatTelegramNewOrderMessage,
  parseTelegramCallbackData,
  timingSafeSecretMatch,
  verifyTelegramWebhookAuthorization,
  type TelegramConfig
} from './telegram.ts';

const TEST_CONFIG: TelegramConfig = {
  botToken: 'test-token',
  adminChatId: '6060470915',
  webhookSecret: 'unit_test_secret_123',
  webhookUrl: 'https://bangla-ai.pro/api/telegram/webhook'
};

test('timingSafeSecretMatch validates exact match and rejects empty or mismatched values', () => {
  assert.equal(timingSafeSecretMatch('unit_test_secret_123', 'unit_test_secret_123'), true);
  assert.equal(timingSafeSecretMatch(' unit_test_secret_123 ', 'unit_test_secret_123'), true);
  assert.equal(timingSafeSecretMatch('wrong_secret', 'unit_test_secret_123'), false);
  assert.equal(timingSafeSecretMatch('', 'unit_test_secret_123'), false);
  assert.equal(timingSafeSecretMatch('unit_test_secret_123', ''), false);
  assert.equal(timingSafeSecretMatch(undefined, 'unit_test_secret_123'), false);
});

test('formatTelegramNewOrderMessage formats all order fields cleanly and masks synthetic guest emails', () => {
  const standardMsg = formatTelegramNewOrderMessage({
    orderId: 'pay_abc12345',
    customerName: 'Rakib Hasan',
    customerEmail: 'rakib@example.com',
    planName: 'Monthly Plan (৳699)',
    amount: 699,
    gateway: 'bkash',
    senderNumber: '01711223344',
    trxId: 'BKH9988776'
  });

  assert.match(standardMsg, /^🟢 \[Bangla AI\] New Order/);
  assert.match(standardMsg, /Customer: Rakib Hasan/);
  assert.match(standardMsg, /Email: rakib@example\.com/);
  assert.match(standardMsg, /Plan: Monthly Plan \(৳699\)/);
  assert.match(standardMsg, /Amount: ৳699 BDT/);
  assert.match(standardMsg, /Method: bKash/);
  assert.match(standardMsg, /Sender: 01711223344/);
  assert.match(standardMsg, /TrxID: BKH9988776/);

  const guestMsg = formatTelegramNewOrderMessage({
    orderId: 'pay_guest1',
    customerName: 'User 3344',
    customerEmail: 'guest_01711223344@phone.bangla-ai.pro',
    planName: 'Yearly Plan (৳5,999)',
    amount: 5999,
    gateway: 'nagad',
    senderNumber: '01711223344',
    trxId: 'NGD1122334'
  });

  assert.match(guestMsg, /Email: Not provided/);
  assert.match(guestMsg, /Amount: ৳5,999 BDT/);
  assert.match(guestMsg, /Method: Nagad/);
});

test('buildOrderInlineKeyboard produces Approve and Reject callback buttons with exact callback_data', () => {
  const keyboard = buildOrderInlineKeyboard('pay_12345678');
  assert.deepEqual(keyboard, {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: 'bangla_ai:approve:pay_12345678' },
        { text: '❌ Reject', callback_data: 'bangla_ai:reject:pay_12345678' }
      ]
    ]
  });
});

test('parseTelegramCallbackData parses bangla_ai and motion_studio callbacks and rejects malformed payloads', () => {
  assert.deepEqual(parseTelegramCallbackData('bangla_ai:approve:pay_99ab12'), {
    target: 'bangla_ai',
    action: 'approve',
    orderId: 'pay_99ab12'
  });
  assert.deepEqual(parseTelegramCallbackData('bangla_ai:reject:pay_99ab12'), {
    target: 'bangla_ai',
    action: 'reject',
    orderId: 'pay_99ab12'
  });
  assert.deepEqual(parseTelegramCallbackData('motion_studio:approve:ord_55'), {
    target: 'motion_studio',
    callbackData: 'motion_studio:approve:ord_55'
  });

  // Malformed or injection attempts
  assert.deepEqual(parseTelegramCallbackData('bangla_ai:delete:pay_1'), { target: 'unknown' });
  assert.deepEqual(parseTelegramCallbackData('bangla_ai:approve:../etc/passwd'), { target: 'unknown' });
  assert.deepEqual(parseTelegramCallbackData('motion_studio:'), { target: 'unknown' });
  assert.deepEqual(parseTelegramCallbackData(''), { target: 'unknown' });
});

test('verifyTelegramWebhookAuthorization requires matching secret token header and admin chat ID', () => {
  assert.equal(
    verifyTelegramWebhookAuthorization({
      chatId: 6060470915,
      fromId: 6060470915,
      secretTokenHeader: 'unit_test_secret_123',
      config: TEST_CONFIG
    }).authorized,
    true
  );

  assert.equal(
    verifyTelegramWebhookAuthorization({
      chatId: 6060470915,
      fromId: 6060470915,
      secretTokenHeader: 'wrong_secret',
      config: TEST_CONFIG
    }).authorized,
    false
  );

  assert.equal(
    verifyTelegramWebhookAuthorization({
      chatId: 123456789,
      fromId: 123456789,
      secretTokenHeader: 'unit_test_secret_123',
      config: TEST_CONFIG
    }).authorized,
    false
  );

  assert.equal(
    verifyTelegramWebhookAuthorization({
      chatId: 6060470915,
      fromId: 999999999,
      secretTokenHeader: 'unit_test_secret_123',
      config: TEST_CONFIG
    }).authorized,
    false
  );
});

test('appendTelegramStatusLine appends cleanly without duplicating an existing suffix', () => {
  const base = '🟢 [Bangla AI] New Order\n\nTrxID: TRX123';
  const approved = appendTelegramStatusLine(base, '✅ Approved');
  assert.equal(approved, '🟢 [Bangla AI] New Order\n\nTrxID: TRX123\n\n✅ Approved');
  assert.equal(appendTelegramStatusLine(approved, '✅ Approved'), approved);
});
