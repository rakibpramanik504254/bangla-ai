import test from 'node:test';
import assert from 'node:assert/strict';
import { isBlockedMetaBrowserBeacon } from './metaPixel.ts';

test('isBlockedMetaBrowserBeacon blocks browser Purchase and Event Setup Tool (cs_est) beacons', () => {
  assert.equal(
    isBlockedMetaBrowserBeacon(
      'https://www.facebook.com/tr/?id=1117895887871417&ev=Purchase&dl=https%3A%2F%2Fbangla-ai.pro%2F&cd[value]=699&cd[currency]=BDT&cd[cs_est]=true'
    ),
    true
  );

  assert.equal(
    isBlockedMetaBrowserBeacon(
      'https://www.facebook.com/tr/?id=1117895887871417&ev=Purchase&cd%5Bvalue%5D=699'
    ),
    true
  );

  assert.equal(
    isBlockedMetaBrowserBeacon(
      'https://www.facebook.com/tr/?id=1117895887871417&ev=Lead&cd%5Bcs_est%5D=true'
    ),
    true
  );

  const formBody = new FormData();
  formBody.append('id', '1117895887871417');
  formBody.append('ev', 'Purchase');
  formBody.append('cd[cs_est]', 'true');
  assert.equal(isBlockedMetaBrowserBeacon('https://www.facebook.com/tr/', formBody), true);

  const paramsBody = new URLSearchParams({ id: '1117895887871417', ev: 'Purchase' });
  assert.equal(isBlockedMetaBrowserBeacon('https://www.facebook.com/tr/', paramsBody), true);
});

test('isBlockedMetaBrowserBeacon allows legitimate PageView, InitiateCheckout, and AddPaymentInfo beacons', () => {
  assert.equal(
    isBlockedMetaBrowserBeacon(
      'https://www.facebook.com/tr/?id=1117895887871417&ev=PageView&dl=https%3A%2F%2Fbangla-ai.pro%2F'
    ),
    false
  );

  assert.equal(
    isBlockedMetaBrowserBeacon(
      'https://www.facebook.com/tr/?id=1117895887871417&ev=InitiateCheckout&cd[value]=699&cd[currency]=BDT'
    ),
    false
  );

  assert.equal(
    isBlockedMetaBrowserBeacon(
      'https://www.facebook.com/tr/?id=1117895887871417&ev=AddPaymentInfo&eid=api_12345'
    ),
    false
  );

  // Non-Meta URLs are never touched
  assert.equal(
    isBlockedMetaBrowserBeacon('https://bangla-ai.pro/api/payments?ev=Purchase'),
    false
  );
});
