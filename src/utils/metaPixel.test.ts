import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildFirstPartyFbcFromFbclid,
  generateFirstPartyFbp
} from './metaPixel.ts';
import { buildMetaCapiFunnelEventPayload } from './metaCapi.ts';

test('generateFirstPartyFbp produces Meta-compliant fb.1.<ts>.<10digits> identifier', () => {
  const fbp = generateFirstPartyFbp(1732250000000);
  assert.match(fbp, /^fb\.1\.1732250000000\.\d{10}$/);
});

test('buildFirstPartyFbcFromFbclid formats valid fbclid and rejects malformed input', () => {
  assert.equal(
    buildFirstPartyFbcFromFbclid('IwAR12345abc', 1732250000000),
    'fb.1.1732250000000.IwAR12345abc'
  );
  assert.equal(buildFirstPartyFbcFromFbclid('   '), undefined);
  assert.equal(buildFirstPartyFbcFromFbclid('bad <script>'), undefined);
});

test('buildMetaCapiFunnelEventPayload constructs server-side PageView and InitiateCheckout payloads', () => {
  const pv = buildMetaCapiFunnelEventPayload({
    eventName: 'PageView',
    eventId: 'pv_test_1',
    eventSourceUrl: 'https://bangla-ai.pro/',
    fbp: 'fb.1.1732250000000.1234567890',
    fbc: 'fb.1.1732250000000.IwAR123',
    clientIpAddress: '103.10.20.30',
    clientUserAgent: 'Mozilla/5.0'
  });
  assert.equal(pv.eventId, 'pv_test_1');
  assert.equal(pv.payload.data[0].event_name, 'PageView');
  assert.equal(pv.payload.data[0].user_data.fbp, 'fb.1.1732250000000.1234567890');
  assert.equal(pv.payload.data[0].user_data.fbc, 'fb.1.1732250000000.IwAR123');
  assert.equal(pv.payload.data[0].custom_data, undefined);

  const ic = buildMetaCapiFunnelEventPayload({
    eventName: 'InitiateCheckout',
    eventId: 'ic_test_2',
    eventSourceUrl: 'https://bangla-ai.pro/checkout',
    planName: 'Monthly Plan',
    valueBdt: 699,
    fbp: 'fb.1.1732250000000.1234567890'
  });
  assert.equal(ic.payload.data[0].event_name, 'InitiateCheckout');
  assert.deepEqual(ic.payload.data[0].custom_data, {
    currency: 'BDT',
    value: 699,
    content_name: 'Monthly Plan',
    content_category: 'AI Subscription',
    num_items: 1
  });
});

test('metaPixel.ts and index.html do NOT load third-party browser fbevents.js', () => {
  const metaPixelSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/utils/metaPixel.ts'), 'utf-8');
  const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
  assert.equal(metaPixelSrc.includes('connect.facebook.net'), false);
  assert.equal(indexHtml.includes('connect.facebook.net'), false);
});
