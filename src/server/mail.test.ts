import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPaymentApprovedEmail,
  buildPaymentRejectedEmail,
  buildPaymentSubmittedAdminEmail,
  buildPaymentSubmittedUserEmail,
  buildPasswordResetOtpEmail,
  buildTestEmail,
  buildWelcomeEmail,
  maskMailWebhookUrl,
  resolveMailRuntimeConfig,
  sendMailSafe,
  sendMailViaAppsScript,
  validateAppsScriptWebhookUrl
} from './mail.ts';

const SAMPLE_EXEC_URL =
  'https://script.google.com/macros/s/AKfycbx1234567890abcdefghijklmnop/exec';

test('validateAppsScriptWebhookUrl accepts valid Apps Script /exec URL and rejects /edit or non-Google URLs', () => {
  assert.equal(validateAppsScriptWebhookUrl(SAMPLE_EXEC_URL).valid, true);
  assert.equal(validateAppsScriptWebhookUrl('').valid, false);
  assert.equal(validateAppsScriptWebhookUrl('http://script.google.com/macros/s/abc/exec').valid, false);
  assert.equal(validateAppsScriptWebhookUrl('https://example.com/webhook').valid, false);

  const editCheck = validateAppsScriptWebhookUrl('https://script.google.com/home/projects/123/edit');
  assert.equal(editCheck.valid, false);
  assert.match(editCheck.error || '', /\/exec/);
});

test('maskMailWebhookUrl masks script deployment id cleanly', () => {
  const masked = maskMailWebhookUrl(SAMPLE_EXEC_URL);
  assert.match(masked, /^https:\/\/script\.google\.com\/macros\/s\/AKfycb••••••mnop\/exec$/);
  assert.equal(maskMailWebhookUrl(''), '');
});

test('resolveMailRuntimeConfig prefers admin_settings over env and respects mail_enabled flag', () => {
  const fromEnv = resolveMailRuntimeConfig(
    { support_email: 'ourbangla.ai@gmail.com' },
    { GOOGLE_APPS_SCRIPT_URL: SAMPLE_EXEC_URL, MAIL_WEBHOOK_SECRET: 'env-sec' }
  );
  assert.equal(fromEnv.configured, true);
  assert.equal(fromEnv.enabled, true);
  assert.equal(fromEnv.source, 'env');
  assert.equal(fromEnv.secret, 'env-sec');

  const fromDb = resolveMailRuntimeConfig(
    {
      mail_enabled: false,
      mail_webhook_url: 'https://script.google.com/macros/s/AKfycbDBURL1234567890/exec',
      mail_webhook_secret: 'db-sec',
      mail_notify_admin_on_payment: false
    },
    { GOOGLE_APPS_SCRIPT_URL: SAMPLE_EXEC_URL }
  );
  assert.equal(fromDb.source, 'admin_settings');
  assert.equal(fromDb.enabled, false);
  assert.equal(fromDb.secret, 'db-sec');
  assert.equal(fromDb.notifyAdminOnPayment, false);
});

test('email templates escape user-supplied HTML and contain key order details', () => {
  const otpMail = buildPasswordResetOtpEmail({
    to: 'user@example.com',
    name: '<script>alert(1)</script>',
    otp: 'RESET-123456'
  });
  assert.doesNotMatch(otpMail.html, /<script>/);
  assert.match(otpMail.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(otpMail.html, /RESET-123456/);
  assert.match(otpMail.text, /RESET-123456/);

  const welcome = buildWelcomeEmail({ to: 'new@example.com', name: 'Ayesha', usageLimit: 10000 });
  assert.match(welcome.subject, /Welcome/i);
  assert.match(welcome.html, /10,000 tokens/);

  const submittedUser = buildPaymentSubmittedUserEmail({
    to: 'payer@example.com',
    name: 'Karim',
    planName: 'Monthly Plan',
    amountBdt: 699,
    gateway: 'bkash',
    trxId: 'TRX998877',
    senderNumber: '01700000000'
  });
  assert.match(submittedUser.html, /TRX998877/);
  assert.match(submittedUser.html, /BKASH/);

  const submittedAdmin = buildPaymentSubmittedAdminEmail({
    to: 'ourbangla.ai@gmail.com',
    userName: 'Karim',
    userEmail: 'payer@example.com',
    planName: 'Yearly Plan',
    amountBdt: 5999,
    gateway: 'nagad',
    trxId: 'NGD112233',
    senderNumber: '01800000000'
  });
  assert.match(submittedAdmin.subject, /NGD112233/);
  assert.match(submittedAdmin.html, /payer@example\.com/);

  const approved = buildPaymentApprovedEmail({
    to: 'payer@example.com',
    name: 'Karim',
    planName: 'Monthly Plan',
    amountBdt: 699,
    gateway: 'bkash',
    trxId: 'TRX998877',
    usageLimit: 1000000,
    expiresAt: '2026-12-15T00:00:00.000Z'
  });
  assert.match(approved.html, /Subscription Activated/);
  assert.match(approved.html, /1,000,000 tokens/);

  const rejected = buildPaymentRejectedEmail({
    to: 'payer@example.com',
    name: 'Karim',
    planName: 'Monthly Plan',
    amountBdt: 699,
    gateway: 'rocket',
    trxId: 'RKT445566',
    note: '<b>Mismatch</b>'
  });
  assert.doesNotMatch(rejected.html, /<b>Mismatch<\/b>/);
  assert.match(rejected.html, /&lt;b&gt;Mismatch&lt;\/b&gt;/);
});

test('sendMailViaAppsScript sends JSON payload cleanly and handles auth/login HTML error', async () => {
  let capturedBody = '';
  const okFetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    capturedBody = String(init?.body || '');
    return new Response(JSON.stringify({ ok: true, sentTo: 'user@example.com' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }) as typeof fetch;

  const result = await sendMailViaAppsScript(
    {
      webhookUrl: SAMPLE_EXEC_URL,
      secret: 'top-secret',
      message: buildTestEmail({ to: 'user@example.com' })
    },
    okFetch
  );

  assert.equal(result.ok, true);
  assert.equal(result.sentTo, 'user@example.com');
  const parsed = JSON.parse(capturedBody);
  assert.equal(parsed.secret, 'top-secret');
  assert.equal(parsed.to, 'user@example.com');

  const loginRedirectFetch = (async () => {
    const res = new Response('<html><title>ServiceLogin</title></html>', {
      status: 200,
      headers: { 'content-type': 'text/html' }
    });
    Object.defineProperty(res, 'url', { value: 'https://accounts.google.com/v3/signin' });
    return res;
  }) as typeof fetch;

  const authErrorResult = await sendMailViaAppsScript(
    {
      webhookUrl: SAMPLE_EXEC_URL,
      message: buildTestEmail({ to: 'user@example.com' })
    },
    loginRedirectFetch
  );
  assert.equal(authErrorResult.ok, false);
  assert.match(authErrorResult.error || '', /Who has access: Anyone/);
});

test('sendMailSafe skips gracefully when unconfigured and catches network failures', async () => {
  const skipped = await sendMailSafe({}, buildTestEmail({ to: 'user@example.com' }), {});
  assert.equal(skipped.ok, false);
  assert.equal(skipped.skipped, true);

  const failingFetch = (async () => {
    throw new Error('ECONNRESET');
  }) as typeof fetch;

  const failed = await sendMailSafe(
    { mail_enabled: true, mail_webhook_url: SAMPLE_EXEC_URL },
    buildTestEmail({ to: 'user@example.com' }),
    {},
    failingFetch
  );
  assert.equal(failed.ok, false);
  assert.equal(failed.skipped, false);
  assert.match(failed.error || '', /ECONNRESET/);
});
