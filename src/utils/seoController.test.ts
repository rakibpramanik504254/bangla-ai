import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFaqPageJsonLd,
  checkFocusKeywordMatches,
  DEFAULT_PAGE_SEO_PRESETS,
  evaluateSeoLength,
  isBuiltInSeoSlug,
  normalizePageSlug,
  resolveEffectiveCanonicalUrl,
  resolvePageSeoForSlug,
  sanitizePageSeoInput,
  sortPageSeoConfigs,
} from './seoController.ts';

test('normalizePageSlug sanitizes routes consistently', () => {
  assert.equal(normalizePageSlug(''), '/');
  assert.equal(normalizePageSlug('/'), '/');
  assert.equal(normalizePageSlug('about/'), '/about');
  assert.equal(normalizePageSlug('///Privacy-Policy//?ref=fb#top'), '/privacy-policy');
});

test('evaluateSeoLength classifies empty, short, optimal, and long bounds accurately', () => {
  assert.equal(evaluateSeoLength('', 30, 60).status, 'empty');
  assert.equal(evaluateSeoLength('Bangla AI', 30, 60).status, 'short');
  assert.equal(
    evaluateSeoLength('Bangla AI — All-in-One Frontier AI Platform', 30, 60).status,
    'optimal'
  );
  assert.equal(
    evaluateSeoLength(
      'Bangla AI — All-in-One Frontier AI Platform With Very Long Unnecessary Repeating Tail Copy',
      30,
      60
    ).status,
    'long'
  );
});

test('checkFocusKeywordMatches detects focus keyword in title, description, and slug', () => {
  const matched = checkFocusKeywordMatches(
    'bangla ai',
    'Bangla AI — Top AI Platform in Bangladesh',
    'Try Bangla AI with bKash and Nagad today.',
    '/bangla-ai-models'
  );
  assert.equal(matched.hasKeyword, true);
  assert.equal(matched.inTitle, true);
  assert.equal(matched.inDescription, true);
  assert.equal(matched.inSlug, true);

  const partial = checkFocusKeywordMatches('bangla ai', 'Home', 'No match', '/about');
  assert.equal(partial.inTitle, false);
  assert.equal(partial.inDescription, false);
  assert.equal(partial.inSlug, false);
});

test('resolveEffectiveCanonicalUrl and buildFaqPageJsonLd produce valid SEO output', () => {
  assert.equal(resolveEffectiveCanonicalUrl('/about', ''), 'https://bangla-ai.pro/about');
  assert.equal(
    resolveEffectiveCanonicalUrl('/about', 'https://bangla-ai.pro/company'),
    'https://bangla-ai.pro/company'
  );

  const schema = buildFaqPageJsonLd(
    [
      { id: '1', question: 'What is Bangla AI?', answer: 'Unified AI platform in Bangladesh.' },
      { id: '2', question: '', answer: 'Ignored incomplete item' },
    ],
    'https://bangla-ai.pro/'
  );
  assert.ok(schema);
  assert.equal(schema['@type'], 'FAQPage');
  const entities = schema.mainEntity as Array<Record<string, unknown>>;
  assert.equal(entities.length, 1);
  assert.equal(entities[0].name, 'What is Bangla AI?');

  assert.equal(DEFAULT_PAGE_SEO_PRESETS[0].slug, '/');
});

test('sanitizePageSeoInput validates URLs, normalizes fields, and rejects dangerous inputs', () => {
  const badSlug = sanitizePageSeoInput({ slug: 'javascript:alert(1)' });
  assert.equal(badSlug.ok, false);

  const badApiSlug = sanitizePageSeoInput({ slug: '/api/admin/seo' });
  assert.equal(badApiSlug.ok, false);

  const badOg = sanitizePageSeoInput({ slug: '/pricing', ogImageUrl: 'javascript:alert(1)' });
  assert.equal(badOg.ok, false);

  const badCanonical = sanitizePageSeoInput({ slug: '/pricing', canonicalOverride: 'not-a-url' });
  assert.equal(badCanonical.ok, false);

  const valid = sanitizePageSeoInput({
    slug: 'Pricing/',
    metaTitle: 'Bangla AI Pricing — ৳699/mo  ',
    metaDescription: 'Subscribe with bKash, Nagad & Rocket.',
    focusKeyword: 'bangla ai pricing',
    ogImageUrl: '/og-banner.png',
    twitterCard: 'summary',
    twitterHandle: 'banglaaipro',
    canonicalOverride: 'https://bangla-ai.pro/pricing',
    noIndex: true,
    noFollow: false,
    faqSchemaEnabled: true,
    faqItems: [
      { id: 'f1', question: 'How much?', answer: '699 BDT per month.' },
      { id: 'f2', question: '', answer: '' },
    ],
  });

  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.config.slug, '/pricing');
    assert.equal(valid.config.pageLabel, 'Pricing');
    assert.equal(valid.config.twitterHandle, '@banglaaipro');
    assert.equal(valid.config.twitterCard, 'summary');
    assert.equal(valid.config.noIndex, true);
    assert.equal(valid.config.faqItems.length, 1);
    assert.ok(valid.config.updatedAt);
  }
});

test('resolvePageSeoForSlug resolves exact matches, presets, and unknown route fallbacks cleanly', () => {
  const customAbout = {
    ...DEFAULT_PAGE_SEO_PRESETS[1],
    metaTitle: 'Custom About Bangla AI',
    noIndex: true,
    faqSchemaEnabled: true,
    faqItems: [
      { id: 'q1', question: 'Where are you based?', answer: 'Dhaka, Bangladesh.' },
    ],
  };

  const exactLookup = resolvePageSeoForSlug([customAbout], '/about/', 'https://bangla-ai.pro');
  assert.equal(exactLookup.matchedExact, true);
  assert.equal(exactLookup.resolved.title, 'Custom About Bangla AI');
  assert.equal(exactLookup.resolved.robots, 'noindex, follow');
  assert.equal(exactLookup.resolved.canonicalUrl, 'https://bangla-ai.pro/about');
  assert.equal(exactLookup.resolved.ogImageUrl, 'https://bangla-ai.pro/og-banner.png');
  assert.ok(exactLookup.resolved.faqJsonLd);

  const presetLookup = resolvePageSeoForSlug([customAbout], '/security', 'https://bangla-ai.pro');
  assert.equal(presetLookup.matchedExact, true);
  assert.equal(presetLookup.resolved.canonicalUrl, 'https://bangla-ai.pro/security');

  const fallbackLookup = resolvePageSeoForSlug([customAbout], '/new-landing-page', 'https://bangla-ai.pro');
  assert.equal(fallbackLookup.matchedExact, false);
  assert.equal(fallbackLookup.resolved.canonicalUrl, 'https://bangla-ai.pro/new-landing-page');
  assert.equal(fallbackLookup.resolved.robots, 'index, follow');

  assert.equal(isBuiltInSeoSlug('/'), true);
  assert.equal(isBuiltInSeoSlug('/pricing'), false);

  const sorted = sortPageSeoConfigs([
    { ...DEFAULT_PAGE_SEO_PRESETS[1], slug: '/zzz-custom' },
    DEFAULT_PAGE_SEO_PRESETS[2],
    DEFAULT_PAGE_SEO_PRESETS[0],
  ]);
  assert.deepEqual(
    sorted.map((s) => s.slug),
    ['/', '/contact', '/zzz-custom']
  );
});

