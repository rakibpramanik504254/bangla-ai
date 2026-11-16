import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FAQ_JSON_LD_SCRIPT_ID,
  applyAppViewFallbackOverrides,
  applyResolvedSeoToDocument,
  buildOptimisticPageSeoFallback,
  injectDynamicPageSeoIntoHtml,
  resolveActiveSeoSlug,
  type HeadDocumentLike,
  type HeadElementLike,
} from './seoHead.ts';
import { DEFAULT_PAGE_SEO_PRESETS, resolvePageSeoForSlug } from './seoController.ts';

class MockHeadEl implements HeadElementLike {
  tagName: string;
  id: string = '';
  textContent: string | null = '';
  attrs: Record<string, string> = {};
  removed = false;
  private registry: MockHeadEl[];

  constructor(tagName: string, registry: MockHeadEl[]) {
    this.tagName = tagName.toLowerCase();
    this.registry = registry;
  }

  setAttribute(name: string, value: string): void {
    this.attrs[name] = value;
    if (name === 'id') this.id = value;
  }

  getAttribute(name: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.attrs, name)
      ? this.attrs[name]
      : null;
  }

  remove(): void {
    this.removed = true;
    const idx = this.registry.indexOf(this);
    if (idx >= 0) this.registry.splice(idx, 1);
  }
}

function createMockDocument(): { doc: HeadDocumentLike; elements: MockHeadEl[] } {
  const elements: MockHeadEl[] = [];

  const doc: HeadDocumentLike = {
    title: 'Initial',
    head: {
      appendChild(node: HeadElementLike) {
        elements.push(node as MockHeadEl);
      },
    },
    querySelector(selector: string) {
      const metaMatch = selector.match(/^meta\[(name|property)="([^"]+)"\]$/);
      if (metaMatch) {
        const [, attr, val] = metaMatch;
        return (
          elements.find((el) => el.tagName === 'meta' && el.getAttribute(attr) === val) ||
          null
        );
      }
      const linkMatch = selector.match(/^link\[rel="([^"]+)"\]$/);
      if (linkMatch) {
        const [, rel] = linkMatch;
        return (
          elements.find((el) => el.tagName === 'link' && el.getAttribute('rel') === rel) ||
          null
        );
      }
      return null;
    },
    getElementById(id: string) {
      return elements.find((el) => el.id === id) || null;
    },
    createElement(tagName: string) {
      return new MockHeadEl(tagName, elements);
    },
  };

  return { doc, elements };
}

test('resolveActiveSeoSlug maps SPA views and custom paths accurately', () => {
  assert.equal(resolveActiveSeoSlug('home', '/'), '/');
  assert.equal(resolveActiveSeoSlug('about', '/about'), '/about');
  assert.equal(resolveActiveSeoSlug('privacy', '/privacy'), '/privacy-policy');
  assert.equal(resolveActiveSeoSlug('terms', '/terms'), '/terms');
  assert.equal(resolveActiveSeoSlug('refund', '/refund-policy'), '/refund-policy');
  assert.equal(resolveActiveSeoSlug('contact', '/contact'), '/contact');
  assert.equal(resolveActiveSeoSlug('security', '/security'), '/security');
  assert.equal(resolveActiveSeoSlug('chat', '/'), '/workspace');
  assert.equal(resolveActiveSeoSlug('account', '/'), '/account');
  assert.equal(resolveActiveSeoSlug('admin', '/'), '/admin');
  assert.equal(resolveActiveSeoSlug('home', '/bangla-chatgpt/'), '/bangla-chatgpt');
});

test('applyAppViewFallbackOverrides marks private app views noindex cleanly when unconfigured', () => {
  const optimisticChat = buildOptimisticPageSeoFallback('/workspace', 'chat');
  assert.equal(optimisticChat.noIndex, true);
  assert.equal(optimisticChat.robots, 'noindex, nofollow');
  assert.equal(optimisticChat.title, 'AI Workspace — Bangla-AI.pro');

  const exactOverride = applyAppViewFallbackOverrides(
    { ...optimisticChat, title: 'Custom Workspace Title', robots: 'index, follow' },
    'chat',
    true
  );
  assert.equal(exactOverride.title, 'Custom Workspace Title');
  assert.equal(exactOverride.robots, 'index, follow');
});

test('applyResolvedSeoToDocument injects, updates, and cleans up head meta, canonical, OG, Twitter, and FAQ schema', () => {
  const { doc } = createMockDocument();

  const homeLookup = resolvePageSeoForSlug(DEFAULT_PAGE_SEO_PRESETS, '/', 'https://bangla-ai.pro');
  applyResolvedSeoToDocument(doc, homeLookup.resolved);

  assert.equal(doc.title, homeLookup.resolved.title);
  assert.equal(doc.querySelector('meta[name="keywords"]')?.getAttribute('content'), 'bangla ai');
  assert.equal(doc.querySelector('meta[name="robots"]')?.getAttribute('content'), 'index, follow');
  assert.equal(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'), 'https://bangla-ai.pro');
  assert.equal(doc.querySelector('meta[name="twitter:site"]')?.getAttribute('content'), '@banglaaipro');
  assert.ok(doc.getElementById(FAQ_JSON_LD_SCRIPT_ID)?.textContent?.includes('FAQPage'));

  // Navigate to a route without FAQ schema and with noindex + summary card + no keywords
  const termsLookup = resolvePageSeoForSlug(
    [
      {
        ...DEFAULT_PAGE_SEO_PRESETS[4],
        focusKeyword: '',
        noIndex: true,
        noFollow: true,
        twitterCard: 'summary',
        canonicalOverride: 'https://bangla-ai.pro/legal/terms',
        faqSchemaEnabled: false,
      },
    ],
    '/terms',
    'https://bangla-ai.pro'
  );
  applyResolvedSeoToDocument(doc, termsLookup.resolved);

  assert.equal(doc.title, termsLookup.resolved.title);
  assert.equal(doc.querySelector('meta[name="keywords"]'), null);
  assert.equal(doc.querySelector('meta[name="robots"]')?.getAttribute('content'), 'noindex, nofollow');
  assert.equal(doc.querySelector('meta[name="twitter:card"]')?.getAttribute('content'), 'summary');
  assert.equal(
    doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    'https://bangla-ai.pro/legal/terms'
  );
  assert.equal(doc.getElementById(FAQ_JSON_LD_SCRIPT_ID), null);
});

test('injectDynamicPageSeoIntoHtml updates HTML document head tags safely with escaping and FAQ JSON-LD', () => {
  const baseHtml = `<!doctype html>
<html>
  <head>
    <title>Default</title>
    <meta name="description" content="Default" />
    <link rel="canonical" href="https://bangla-ai.pro" />
  </head>
  <body><div id="root"></div></body>
</html>`;

  const lookup = resolvePageSeoForSlug(
    [
      {
        ...DEFAULT_PAGE_SEO_PRESETS[1],
        metaTitle: 'About "Bangla AI" <2026>',
        metaDescription: 'Unified & affordable AI workspace.',
        focusKeyword: 'bangla ai, gpt bd',
        noIndex: true,
        noFollow: false,
        twitterCard: 'summary',
        twitterHandle: '@banglaaipro',
        canonicalOverride: 'https://bangla-ai.pro/about-us',
        faqSchemaEnabled: true,
        faqItems: [
          {
            id: 'faq-about-1',
            question: 'Who built <Bangla AI>?',
            answer: 'Built for Bangladesh.',
          },
        ],
      },
    ],
    '/about',
    'https://bangla-ai.pro'
  );

  const html = injectDynamicPageSeoIntoHtml(baseHtml, lookup.resolved);
  assert.match(html, /<title>About "Bangla AI" &lt;2026&gt;<\/title>/);
  assert.match(html, /<meta name="robots" content="noindex, follow" \/>/);
  assert.match(html, /<meta name="keywords" content="bangla ai, gpt bd" \/>/);
  assert.match(html, /<meta name="twitter:card" content="summary" \/>/);
  assert.match(html, /<meta name="twitter:site" content="@banglaaipro" \/>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/bangla-ai\.pro\/about-us" \/>/);
  assert.match(html, /<script id="bangla-ai-faq-ld-json" type="application\/ld\+json">/);
  assert.ok(!html.includes('<Bangla AI>'));
});
