import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CANONICAL_ORIGIN,
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  injectSeoMetaIntoHtml,
  parseDataUrlImage,
  resolveBrowserPreviewImageUrl,
  resolveOgImageUrl,
  resolveSeoMetadata
} from './seo';

test('resolveSeoMetadata returns Bangladeshi defaults when settings are empty', () => {
  const meta = resolveSeoMetadata({});
  assert.equal(meta.title, DEFAULT_SEO_TITLE);
  assert.equal(meta.description, DEFAULT_SEO_DESCRIPTION);
  assert.equal(meta.siteName, 'Bangla-AI.pro');
  assert.equal(meta.canonicalUrl, 'https://bangla-ai.pro');
  assert.equal(meta.ogUrl, 'https://bangla-ai.pro');
  assert.equal(meta.ogImageUrl, 'https://bangla-ai.pro/og-banner.png');
  assert.equal(meta.imageWidth, '1200');
  assert.equal(meta.imageHeight, '630');
});

test('resolveOgImageUrl preserves full URLs and expands relative paths to canonical domain', () => {
  assert.equal(
    resolveOgImageUrl('/og-banner.png', DEFAULT_CANONICAL_ORIGIN),
    'https://bangla-ai.pro/og-banner.png'
  );
  assert.equal(
    resolveOgImageUrl('/api/seo/og-banner?v=123', DEFAULT_CANONICAL_ORIGIN),
    'https://bangla-ai.pro/api/seo/og-banner?v=123'
  );
  assert.equal(
    resolveOgImageUrl('https://cdn.bangla-ai.pro/custom-og.png'),
    'https://cdn.bangla-ai.pro/custom-og.png'
  );
  assert.equal(resolveBrowserPreviewImageUrl(''), DEFAULT_OG_IMAGE_PATH);
  assert.equal(resolveBrowserPreviewImageUrl('og-banner.png'), '/og-banner.png');
});

test('injectSeoMetaIntoHtml dynamically replaces title, OG tags, Twitter cards, canonical, and escapes HTML', () => {
  const baseHtml = `<!doctype html>
<html lang="en">
  <head>
    <title>Old Title</title>
    <meta name="description" content="Old description" />
    <meta property="og:title" content="Old OG" />
    <link rel="canonical" href="https://old.example" />
  </head>
  <body><div id="root"></div></body>
</html>`;

  const meta = resolveSeoMetadata({
    seo_title: 'Bangla AI "Pro" <v2>',
    seo_description: 'সব AI মডেল একসাথে & বিকাশে পেমেন্ট',
    seo_og_image_url: '/api/seo/og-banner?v=99'
  });

  const injected = injectSeoMetaIntoHtml(baseHtml, meta);
  assert.match(injected, /<title>Bangla AI "Pro" &lt;v2&gt;<\/title>/);
  assert.match(injected, /<meta property="og:title" content="Bangla AI &quot;Pro&quot; &lt;v2&gt;" \/>/);
  assert.match(injected, /<meta property="og:description" content="সব AI মডেল একসাথে &amp; বিকাশে পেমেন্ট" \/>/);
  assert.match(injected, /<meta property="og:image" content="https:\/\/bangla-ai\.pro\/api\/seo\/og-banner\?v=99" \/>/);
  assert.match(injected, /<meta property="og:image:width" content="1200" \/>/);
  assert.match(injected, /<meta property="og:image:height" content="630" \/>/);
  assert.match(injected, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.match(injected, /<meta name="twitter:image" content="https:\/\/bangla-ai\.pro\/api\/seo\/og-banner\?v=99" \/>/);
  assert.match(injected, /<link rel="canonical" href="https:\/\/bangla-ai\.pro" \/>/);
  assert.match(injected, /<script id="bangla-ai-ld-json" type="application\/ld\+json">/);
});

test('parseDataUrlImage validates base64 image data URLs and rejects invalid payloads', () => {
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64');
  const parsed = parseDataUrlImage(`data:image/png;base64,${pngBytes}`);
  assert.ok(parsed);
  assert.equal(parsed.mimeType, 'image/png');
  assert.equal(parsed.buffer.length, 4);

  assert.equal(parseDataUrlImage('data:text/html;base64,PGgxPg=='), null);
  assert.equal(parseDataUrlImage('https://example.com/banner.png'), null);
  assert.equal(parseDataUrlImage(`data:image/png;base64,${pngBytes}`, 2), null);
});
