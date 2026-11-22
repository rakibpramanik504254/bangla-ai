import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVELOPER_API_BASE_URL,
  DEVELOPER_API_KEY_PREFIX,
  computeEffectiveDailyUsage,
  evaluateApiKeyQuota,
  extractBearerApiKey,
  generateDeveloperApiKey,
  hashDeveloperApiKey,
  isValidDeveloperApiKeyFormat,
  resolveDeveloperApiModel,
  sanitizeOpenAiChatCompletionsBody,
} from './developerApi.ts';
import { Database } from '../db/database.ts';
import type { AiModel } from '../types/index.ts';

test('generateDeveloperApiKey generates sk-banglaai- keys with deterministic SHA-256 hash and masked prefix', () => {
  const generated = generateDeveloperApiKey();
  assert.equal(DEVELOPER_API_BASE_URL, 'https://bangla-ai.pro/api/v1');
  assert.ok(generated.plainKey.startsWith(DEVELOPER_API_KEY_PREFIX));
  assert.equal(isValidDeveloperApiKeyFormat(generated.plainKey), true);
  assert.equal(hashDeveloperApiKey(generated.plainKey), generated.keyHash);
  assert.equal(generated.keyHash.length, 64);
  assert.ok(generated.keyPrefix.startsWith('sk-banglaai-'));
  assert.ok(generated.keyPrefix.includes('...'));
  assert.notEqual(generated.keyPrefix, generated.plainKey);
});

test('extractBearerApiKey and isValidDeveloperApiKeyFormat validate Bearer headers cleanly', () => {
  const { plainKey } = generateDeveloperApiKey();
  assert.equal(extractBearerApiKey(`Bearer ${plainKey}`), plainKey);
  assert.equal(extractBearerApiKey(`bearer   ${plainKey}  `), plainKey);
  assert.equal(extractBearerApiKey('Basic abc123'), null);
  assert.equal(extractBearerApiKey(undefined), null);

  assert.equal(isValidDeveloperApiKeyFormat(plainKey), true);
  assert.equal(isValidDeveloperApiKeyFormat('sk-openai-12345678901234567890123456'), false);
  assert.equal(isValidDeveloperApiKeyFormat('sk-banglaai-short'), false);
});

test('evaluateApiKeyQuota enforces enabled status, credits, daily limit, and UTC day rollover', () => {
  const baseKey = {
    is_enabled: true,
    credits: 10,
    daily_limit: 5,
    daily_requests_used: 3,
    daily_usage_date: '2026-11-22',
  };

  // Same UTC day: 3/5 used -> allowed, 1 credit deducted
  const okToday = evaluateApiKeyQuota(baseKey, { todayUtc: '2026-11-22' });
  assert.equal(okToday.allowed, true);
  if (okToday.allowed) {
    assert.equal(okToday.usedToday, 3);
    assert.equal(okToday.remainingTodayAfter, 1);
    assert.equal(okToday.creditsAfter, 9);
  }

  // Next UTC day: daily count resets to 0
  const rollover = computeEffectiveDailyUsage(baseKey, '2026-11-23');
  assert.equal(rollover.usedToday, 0);
  assert.equal(rollover.remainingToday, 5);

  // Daily limit reached -> 429
  const rateLimited = evaluateApiKeyQuota(
    { ...baseKey, daily_requests_used: 5 },
    { todayUtc: '2026-11-22' }
  );
  assert.equal(rateLimited.allowed, false);
  if (!rateLimited.allowed) {
    assert.equal(rateLimited.statusCode, 429);
    assert.equal(rateLimited.code, 'rate_limit_exceeded');
  }

  // Out of credits -> 402
  const noCredits = evaluateApiKeyQuota(
    { ...baseKey, credits: 0 },
    { todayUtc: '2026-11-22' }
  );
  assert.equal(noCredits.allowed, false);
  if (!noCredits.allowed) {
    assert.equal(noCredits.statusCode, 402);
    assert.equal(noCredits.code, 'insufficient_quota');
  }

  // Disabled key -> 403
  const disabled = evaluateApiKeyQuota(
    { ...baseKey, is_enabled: false },
    { todayUtc: '2026-11-22' }
  );
  assert.equal(disabled.allowed, false);
  if (!disabled.allowed) {
    assert.equal(disabled.statusCode, 403);
    assert.equal(disabled.code, 'api_key_disabled');
  }
});

test('sanitizeOpenAiChatCompletionsBody validates messages and resolves catalog/OpenRouter models', () => {
  const models: AiModel[] = [
    {
      id: 'mod_gpt_6_astra',
      provider_id: 'prov_openrouter',
      model_name: 'gpt-6-astra',
      display_name: 'GPT-6 Astra',
      description_en: 'Flagship model',
      badge: 'max',
      is_enabled: true,
      is_default: true,
      context_window: 128000,
      max_output_tokens: 4096,
      sort_order: 1,
      openrouter_model_id: 'openai/gpt-4o',
    },
  ];

  const bad = sanitizeOpenAiChatCompletionsBody({ messages: [] }, models);
  assert.equal(bad.ok, false);

  const goodCatalog = sanitizeOpenAiChatCompletionsBody(
    {
      model: 'gpt-6-astra',
      messages: [{ role: 'user', content: 'Hi' }],
      temperature: 0.7,
      max_tokens: 512,
      stream: true,
      extra_untrusted_field: 'ignored',
    },
    models
  );
  assert.equal(goodCatalog.ok, true);
  if (goodCatalog.ok) {
    assert.equal(goodCatalog.data.openRouterModel, 'openai/gpt-4o');
    assert.equal(goodCatalog.data.stream, true);
    assert.equal('extra_untrusted_field' in goodCatalog.data.payload, false);
  }

  const directSlug = resolveDeveloperApiModel('google/gemini-2.5-flash', models);
  assert.equal(directSlug.openRouterModel, 'google/gemini-2.5-flash');
});

test('Database Developer API lifecycle: create, deduct credit, refund, daily limit, admin update, delete', async () => {
  const memDb = new Database({ pool: null, databaseUrl: '' });
  await memDb.init();

  // Admin updates defaults
  await memDb.updateSettings({ api_default_daily_limit: 2, api_default_credits: 3 });

  // User creates key
  const { key, plainKey } = await memDb.createDeveloperApiKey('usr_sub_002', 'Production Bot');
  assert.ok(plainKey.startsWith('sk-banglaai-'));
  assert.equal(key.name, 'Production Bot');
  assert.equal(key.credits, 3);
  assert.equal(key.daily_limit, 2);
  assert.equal(key.daily_requests_used, 0);

  // Consume 1 credit (req #1)
  const c1 = await memDb.consumeDeveloperApiKeyCredit(plainKey, '2026-11-22');
  assert.equal(c1.ok, true);
  if (c1.ok) {
    assert.equal(c1.key.credits, 2);
    assert.equal(c1.key.daily_requests_used, 1);
    assert.equal(c1.key.daily_remaining, 1);
  }

  // Consume 2nd credit (req #2 -> hits daily limit 2/2)
  const c2 = await memDb.consumeDeveloperApiKeyCredit(plainKey, '2026-11-22');
  assert.equal(c2.ok, true);

  // 3rd request on same UTC day -> blocked with 429
  const c3 = await memDb.consumeDeveloperApiKeyCredit(plainKey, '2026-11-22');
  assert.equal(c3.ok, false);
  if (!c3.ok) assert.equal(c3.statusCode, 429);

  // Refund 1 credit (simulating upstream failure) -> back to 1/2 used and 2 credits
  await memDb.refundDeveloperApiKeyCredit(key.id, '2026-11-22');
  const keysAfterRefund = await memDb.listUserDeveloperApiKeys('usr_sub_002');
  assert.equal(keysAfterRefund[0].credits, 2);

  // Admin disables key -> blocked with 403
  await memDb.adminUpdateDeveloperApiKey(key.id, { is_enabled: false });
  const cDisabled = await memDb.consumeDeveloperApiKeyCredit(plainKey, '2026-11-22');
  assert.equal(cDisabled.ok, false);
  if (!cDisabled.ok) assert.equal(cDisabled.statusCode, 403);

  // Admin re-enables, adds +10 credits, and raises daily limit
  const updated = await memDb.adminUpdateDeveloperApiKey(key.id, {
    is_enabled: true,
    add_credits: 10,
    daily_limit: 100,
    reset_daily_usage: true,
  });
  assert.equal(updated?.credits, 12);
  assert.equal(updated?.daily_limit, 100);
  assert.equal(updated?.daily_requests_used, 0);

  // User deletes key
  const deleted = await memDb.deleteUserDeveloperApiKey(key.id, 'usr_sub_002');
  assert.equal(deleted, true);
  const afterDelete = await memDb.consumeDeveloperApiKeyCredit(plainKey, '2026-11-22');
  assert.equal(afterDelete.ok, false);
  if (!afterDelete.ok) assert.equal(afterDelete.statusCode, 401);
});

test('Developer API paid gate enforces active Monthly/Yearly subscription and ৳399 verified payment per key', async () => {
  const memDb = new Database({ pool: null, databaseUrl: '' });
  await memDb.init();

  // 1. Free user (no active Monthly/Yearly subscription) -> blocked with SUBSCRIPTION_REQUIRED (403)
  const freeUser = await memDb.createUser({
    email: 'free-api-tester@example.com',
    password: 'Password123!',
    name: 'Free Tester',
    phone: '01711111111',
  });

  const freeBilling = await memDb.getUserDeveloperApiBillingStatus(freeUser.id);
  assert.equal(freeBilling.hasActiveSubscription, false);
  assert.equal(freeBilling.priceBdt, 399);
  assert.equal(freeBilling.availablePaidSlots, 0);

  await assert.rejects(
    () => memDb.createDeveloperApiKey(freeUser.id, 'Blocked Key', { requirePaidAddon: true }),
    (err: any) => err?.code === 'SUBSCRIPTION_REQUIRED' && err?.statusCode === 403
  );

  // 2. Active Monthly subscriber (usr_sub_002) WITHOUT ৳399 add-on payment -> blocked with PAYMENT_REQUIRED (402)
  const subBefore = await memDb.getSubscriptionByUserId('usr_sub_002');
  assert.equal(subBefore?.plan_id, 'monthly');
  assert.equal(subBefore?.status, 'active');

  const subBillingInitial = await memDb.getUserDeveloperApiBillingStatus('usr_sub_002');
  assert.equal(subBillingInitial.hasActiveSubscription, true);
  assert.equal(subBillingInitial.availablePaidSlots, 0);
  assert.equal(subBillingInitial.pendingPayment, null);

  await assert.rejects(
    () => memDb.createDeveloperApiKey('usr_sub_002', 'Paid Key', { requirePaidAddon: true }),
    (err: any) => err?.code === 'PAYMENT_REQUIRED' && err?.statusCode === 402
  );

  // 3. Subscriber submits ৳399 Developer API payment -> pending -> still blocked until admin approves
  const pendingAddon = await memDb.createPendingPayment({
    userId: 'usr_sub_002',
    planId: 'developer_api',
    gateway: 'bkash',
    trxId: 'DEVAPI399TRX1',
    senderNumber: '01722222222',
  });
  assert.equal(pendingAddon.amount, 399);
  assert.equal(pendingAddon.plan_id, 'developer_api');
  assert.equal(pendingAddon.status, 'pending');

  const billingWhilePending = await memDb.getUserDeveloperApiBillingStatus('usr_sub_002');
  assert.equal(billingWhilePending.availablePaidSlots, 0);
  assert.equal(billingWhilePending.pendingPayment?.trx_id, 'DEVAPI399TRX1');

  await assert.rejects(
    () => memDb.createDeveloperApiKey('usr_sub_002', 'Still Pending', { requirePaidAddon: true }),
    (err: any) => err?.code === 'PAYMENT_REQUIRED' && err?.statusCode === 402
  );

  // 4. Admin approves ৳399 payment -> unlocks 1 paid slot WITHOUT modifying Monthly subscription
  const approved = await memDb.approvePayment(pendingAddon.id, 'usr_admin_001');
  assert.equal(approved.payment.status, 'completed');
  const subAfter = await memDb.getSubscriptionByUserId('usr_sub_002');
  assert.equal(subAfter?.id, subBefore?.id);
  assert.equal(subAfter?.plan_id, 'monthly');
  assert.equal(subAfter?.expires_at, subBefore?.expires_at);

  const billingUnlocked = await memDb.getUserDeveloperApiBillingStatus('usr_sub_002');
  assert.equal(billingUnlocked.availablePaidSlots, 1);
  assert.equal(billingUnlocked.pendingPayment, null);

  // 5. Subscriber creates API key -> succeeds and consumes the ৳399 paid slot
  const created = await memDb.createDeveloperApiKey('usr_sub_002', 'Paid Production Key', {
    requirePaidAddon: true,
  });
  assert.ok(created.plainKey.startsWith('sk-banglaai-'));

  const billingAfterRedeem = await memDb.getUserDeveloperApiBillingStatus('usr_sub_002');
  assert.equal(billingAfterRedeem.availablePaidSlots, 0);

  // 6. Deleting the key & retrying without paying another ৳399 -> blocked again (prevents free-credit farming)
  await memDb.deleteUserDeveloperApiKey(created.key.id, 'usr_sub_002');
  await assert.rejects(
    () => memDb.createDeveloperApiKey('usr_sub_002', 'Second Key Attempt', { requirePaidAddon: true }),
    (err: any) => err?.code === 'PAYMENT_REQUIRED' && err?.statusCode === 402
  );
});

