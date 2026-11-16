import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAndroidChromeIntentUrl,
  deriveGuestDisplayName,
  formatDisabledMfsGatewayMessage,
  formatUserContactSubtitle,
  getMfsPaymentGuide,
  isAndroidUserAgent,
  isFacebookInAppBrowser,
  isMfsGatewayEnabled,
  isSyntheticPhoneEmail,
  isValidBdPhoneNumber,
  isValidEmailAddress,
  normalizeBdPhoneNumber,
  resolveActiveMfsGateway,
  resolveEnabledMfsGateways,
  synthesizeGuestEmailFromPhone
} from './expressCheckout.ts';

test('normalizeBdPhoneNumber and isValidBdPhoneNumber handle +880, spaces, and 01x formats', () => {
  assert.equal(normalizeBdPhoneNumber('+880 1712-345678'), '01712345678');
  assert.equal(normalizeBdPhoneNumber('8801812345678'), '01812345678');
  assert.equal(normalizeBdPhoneNumber('01912 345 678'), '01912345678');

  assert.equal(isValidBdPhoneNumber('+8801712345678'), true);
  assert.equal(isValidBdPhoneNumber('01622860128'), true);
  assert.equal(isValidBdPhoneNumber('01234567890'), false);
  assert.equal(isValidBdPhoneNumber('017123'), false);
});

test('synthetic phone email and display name helpers work cleanly', () => {
  const email = synthesizeGuestEmailFromPhone('+8801712345678');
  assert.equal(email, '01712345678@phone.bangla-ai.pro');
  assert.equal(isSyntheticPhoneEmail(email), true);
  assert.equal(isSyntheticPhoneEmail('ourbangla.ai@gmail.com'), false);

  assert.equal(
    deriveGuestDisplayName({ email: 'tanvir.ahmed@gmail.com', phone: '01712345678' }),
    'tanvir.ahmed'
  );
  assert.equal(
    deriveGuestDisplayName({ phone: '01712345678' }),
    'Customer 5678'
  );
  assert.equal(isValidEmailAddress('user@gmail.com'), true);
  assert.equal(isValidEmailAddress('not-an-email'), false);

  assert.equal(
    formatUserContactSubtitle({ email, phone: '01712345678', needs_email: true }),
    'Phone: 01712345678'
  );
  assert.equal(
    formatUserContactSubtitle({ email: 'real@gmail.com', phone: '01712345678', needs_email: false }),
    'real@gmail.com'
  );
});

test('Facebook In-App Browser and Android Chrome intent detection work accurately', () => {
  const fbAndroidUa =
    'Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 [FBAN/EMA;FBLC/en_US;FBAV/380.0.0.15.107;]';
  const normalChromeUa =
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

  assert.equal(isFacebookInAppBrowser(fbAndroidUa), true);
  assert.equal(isFacebookInAppBrowser('Instagram 310.0.0.0 Android'), true);
  assert.equal(isFacebookInAppBrowser(normalChromeUa), false);
  assert.equal(isAndroidUserAgent(fbAndroidUa), true);

  assert.equal(
    buildAndroidChromeIntentUrl('https://bangla-ai.pro/#pricing'),
    'intent://bangla-ai.pro/#pricing#Intent;scheme=https;package=com.android.chrome;end'
  );
});

test('getMfsPaymentGuide returns gateway-specific USSD and 3 clear Send Money steps', () => {
  const bkashGuide = getMfsPaymentGuide({
    gateway: 'bkash',
    amountText: '৳699',
    merchantNumber: '01812345678',
  });
  assert.equal(bkashGuide.gatewayName, 'bKash');
  assert.equal(bkashGuide.ussdCode, '*247#');
  assert.equal(bkashGuide.steps.length, 3);
  assert.equal(bkashGuide.steps[0], 'Open bKash App or dial *247# and select Send Money.');
  assert.equal(bkashGuide.steps[0].includes('Cash Out'), false);
  assert.match(bkashGuide.steps[1], /01812345678.*৳699/);
  assert.deepEqual(
    bkashGuide.stepSegments.flatMap(s => s.filter(seg => seg.bold).map(seg => seg.text)),
    ['Send Money', '01812345678', '৳699', 'SMS TrxID']
  );

  const nagadGuide = getMfsPaymentGuide({
    gateway: 'nagad',
    amountText: '৳5,999',
    merchantNumber: '01712345678',
  });
  assert.equal(nagadGuide.ussdCode, '*167#');
  assert.match(nagadGuide.steps[1], /৳5,999/);

  const rocketGuide = getMfsPaymentGuide({
    gateway: 'rocket',
    amountText: '৳699',
    merchantNumber: '01912345678',
  });
  assert.equal(rocketGuide.ussdCode, '*322#');
});

test('MFS gateway availability helpers filter disabled methods and select active fallback cleanly', () => {
  assert.deepEqual(resolveEnabledMfsGateways(undefined), ['bkash', 'nagad', 'rocket']);

  const withoutBkash = { bkash_enabled: false, nagad_enabled: true, rocket_enabled: true };
  const enabledWithoutBkash = resolveEnabledMfsGateways(withoutBkash);
  assert.deepEqual(enabledWithoutBkash, ['nagad', 'rocket']);
  assert.equal(resolveActiveMfsGateway(enabledWithoutBkash, 'bkash'), 'nagad');
  assert.equal(resolveActiveMfsGateway(enabledWithoutBkash, 'rocket'), 'rocket');
  assert.equal(isMfsGatewayEnabled('bkash', withoutBkash), false);
  assert.equal(isMfsGatewayEnabled('nagad', withoutBkash), true);
  assert.equal(
    formatDisabledMfsGatewayMessage('bkash', withoutBkash),
    'bKash is temporarily unavailable. Please select Nagad or Rocket instead.'
  );

  const onlyRocket = { bkash_enabled: false, nagad_enabled: false, rocket_enabled: true };
  assert.deepEqual(resolveEnabledMfsGateways(onlyRocket), ['rocket']);
  assert.equal(resolveActiveMfsGateway(['rocket'], 'bkash'), 'rocket');
  assert.equal(
    formatDisabledMfsGatewayMessage('bkash', onlyRocket),
    'bKash is temporarily unavailable. Please select Rocket instead.'
  );
});
