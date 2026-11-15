import test from 'node:test';
import assert from 'node:assert/strict';
import { resetScrollPosition } from './scroll.ts';

test('resetScrollPosition calls instant window.scrollTo and resets document & overflow containers to 0', () => {
  const scrollCalls: Array<ScrollToOptions | number | undefined> = [];
  const fakeWindow = {
    scrollTo: (arg?: ScrollToOptions | number) => {
      scrollCalls.push(arg);
    },
  };

  const containerA = { scrollTop: 420 };
  const containerB = { scrollTop: 980 };
  const fakeDoc = {
    documentElement: { scrollTop: 1500, scrollLeft: 12 },
    body: { scrollTop: 1500, scrollLeft: 12 },
    querySelectorAll: () => [containerA, containerB],
  };

  resetScrollPosition(fakeWindow, fakeDoc);

  assert.deepEqual(scrollCalls[0], { top: 0, left: 0, behavior: 'instant' });
  assert.equal(fakeDoc.documentElement.scrollTop, 0);
  assert.equal(fakeDoc.documentElement.scrollLeft, 0);
  assert.equal(fakeDoc.body.scrollTop, 0);
  assert.equal(fakeDoc.body.scrollLeft, 0);
  assert.equal(containerA.scrollTop, 0);
  assert.equal(containerB.scrollTop, 0);
});
