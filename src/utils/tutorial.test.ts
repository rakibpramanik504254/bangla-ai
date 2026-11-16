import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TUTORIAL_EMBED_URL,
  hasUserActiveSubscription,
  shouldShowTutorialCta,
} from './tutorial.ts';

test('uses the YouTube embed URL with autoplay and hidden player controls', () => {
  assert.equal(
    TUTORIAL_EMBED_URL,
    'https://www.youtube.com/embed/4vOQlywNRCA?autoplay=1&controls=0&fs=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&disablekb=1'
  );
});

test('hasUserActiveSubscription handles guests, free users, active subscribers, and admins', () => {
  assert.equal(hasUserActiveSubscription(null), false);
  assert.equal(hasUserActiveSubscription(undefined), false);

  assert.equal(
    hasUserActiveSubscription({ role: 'user', isSubscribed: false, subscription: null }),
    false
  );

  assert.equal(
    hasUserActiveSubscription({
      role: 'user',
      isSubscribed: false,
      subscription: {
        status: 'active',
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      } as any,
    }),
    false
  );

  assert.equal(
    hasUserActiveSubscription({ role: 'user', isSubscribed: true, subscription: null }),
    true
  );

  assert.equal(
    hasUserActiveSubscription({
      role: 'user',
      isSubscribed: false,
      subscription: {
        status: 'active',
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      } as any,
    }),
    true
  );

  assert.equal(
    hasUserActiveSubscription({ role: 'admin', isSubscribed: false, subscription: null }),
    true
  );
});

test('shouldShowTutorialCta shows only for non-subscribers and avoids loading flash', () => {
  assert.equal(
    shouldShowTutorialCta({ user: null, loading: false, hasStoredToken: false }),
    true
  );

  assert.equal(
    shouldShowTutorialCta({ user: null, loading: true, hasStoredToken: true }),
    false
  );

  assert.equal(
    shouldShowTutorialCta({
      user: { role: 'user', isSubscribed: false, subscription: null },
      loading: false,
      hasStoredToken: true,
    }),
    true
  );

  assert.equal(
    shouldShowTutorialCta({
      user: { role: 'user', isSubscribed: true, subscription: null },
      loading: false,
      hasStoredToken: true,
    }),
    false
  );
});
