import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDynamicModelSeoConfig,
  buildRobotsTxt,
  buildSitemapXml,
  collectSitemapEntries,
  GA4_INIT_SCRIPT_ID,
  GA4_SRC_SCRIPT_ID,
  GSC_VERIFICATION_META_NAME,
  injectTechnicalSeoIntoHtml,
  resolvePageOrModelSeo,
  sanitizeRobotsTxtExtra,
  syncGscMetaTagInDocument,
  toModelSeoSlug,
  validateGa4MeasurementId,
  validateGscVerificationCode,
} from './technicalSeo.ts';
import { DEFAULT_PAGE_SEO_PRESETS } from './seoController.ts';
import type { AiModel } from '../types/index.ts';

const SAMPLE_MODELS: AiModel[] = [
  {
    id: 'mod_gemini_4_carbon',
    provider_id: 'prov_gemini',
    model_name: 'gemini-4-carbon',
    display_name: 'Gemini 4 Carbon (high)',
    description_en: 'Next-gen Google Carbon architecture.',
    badge: 'high',
    is_enabled: true,
    is_default: true,
    context_window: 2000000,
    max_output_tokens: 16384,
    sort_order: 1,
  },
  {
    id: 'mod_disabled_model',
    provider_id: 'prov_openai',
    model_name: 'old-disabled-model',
    display_name: 'Disabled Model',
    description_en: 'Should not appear in sitemap',
    badge: 'balanced',
    is_enabled: false,
    is_default: false,
    context_window: 128000,
    max_output_tokens: 4096,
    sort_order: 2,
  },
];

test('validateGscVerificationCode extracts token from pasted meta tag and rejects XSS payloads', () => {
  assert.deepEqual(validateGscVerificationCode(''), { valid: true, code: '' });
  assert.deepEqual(validateGscVerificationCode('abcDEF123_456-xyz'), {
    valid: true,
    code: 'abcDEF123_456-xyz',
  });
  assert.deepEqual(
    validateGscVerificationCode(
      '<meta name="google-site-verification" content="VerifyToken_987654321" />'
    ),
    { valid: true, code: 'VerifyToken_987654321' }
  );

  const invalid = validateGscVerificationCode('<script>alert(1)</script>');
  assert.equal(invalid.valid, false);
});

test('validateGa4MeasurementId normalizes valid G- IDs and rejects invalid inputs', () => {
  assert.deepEqual(validateGa4MeasurementId(''), { valid: true, measurementId: '' });
  assert.deepEqual(validateGa4MeasurementId('g-abc123def4'), {
    valid: true,
    measurementId: 'G-ABC123DEF4',
  });
  assert.deepEqual(
    validateGa4MeasurementId(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=G-9XYZ887766"></script>`
    ),
    { valid: true, measurementId: 'G-9XYZ887766' }
  );

  const invalid = validateGa4MeasurementId('UA-12345-1');
  assert.equal(invalid.valid, false);
});

test('collectSitemapEntries & buildSitemapXml dynamically include pages and enabled models while filtering noindex', () => {
  const configs = [
    ...DEFAULT_PAGE_SEO_PRESETS,
    {
      ...DEFAULT_PAGE_SEO_PRESETS[0],
      slug: '/bangla-chatgpt',
      pageLabel: 'Bangla ChatGPT',
      noIndex: false,
    },
    {
      ...DEFAULT_PAGE_SEO_PRESETS[0],
      slug: '/secret-draft',
      pageLabel: 'Secret Draft',
      noIndex: true,
    },
    {
      ...DEFAULT_PAGE_SEO_PRESETS[0],
      slug: '/workspace',
      pageLabel: 'Workspace',
      noIndex: false,
    },
  ];

  const entries = collectSitemapEntries({
    pageConfigs: configs,
    models: SAMPLE_MODELS,
    origin: 'https://bangla-ai.pro',
    now: new Date('2026-11-16T00:00:00.000Z'),
  });

  const locs = entries.map((e) => e.loc);
  assert.ok(locs.includes('https://bangla-ai.pro/'));
  assert.ok(locs.includes('https://bangla-ai.pro/about'));
  assert.ok(locs.includes('https://bangla-ai.pro/bangla-chatgpt'));
  assert.ok(locs.includes('https://bangla-ai.pro/models/gemini-4-carbon'));

  // Excluded: noindex draft, internal app route, disabled model
  assert.equal(locs.includes('https://bangla-ai.pro/secret-draft'), false);
  assert.equal(locs.includes('https://bangla-ai.pro/workspace'), false);
  assert.equal(locs.includes('https://bangla-ai.pro/models/disabled-model'), false);

  const xml = buildSitemapXml(entries);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  assert.ok(xml.includes('<loc>https://bangla-ai.pro/models/gemini-4-carbon</loc>'));
});

test('buildDynamicModelSeoConfig & resolvePageOrModelSeo serve model metadata automatically', () => {
  assert.equal(toModelSeoSlug(SAMPLE_MODELS[0]), '/models/gemini-4-carbon');
  const dynamic = buildDynamicModelSeoConfig(SAMPLE_MODELS[0]);
  assert.ok(dynamic.metaTitle.includes('Gemini 4 Carbon'));

  const lookup = resolvePageOrModelSeo(
    DEFAULT_PAGE_SEO_PRESETS,
    SAMPLE_MODELS,
    '/models/gemini-4-carbon',
    'https://bangla-ai.pro'
  );
  assert.equal(lookup.matchedExact, true);
  assert.equal(lookup.matchedModel?.id, 'mod_gemini_4_carbon');
  assert.equal(lookup.resolved.canonicalUrl, 'https://bangla-ai.pro/models/gemini-4-carbon');
});

test('buildRobotsTxt enforces core disallow paths, sanitizes custom rules, and links sitemap.xml', () => {
  const cleaned = sanitizeRobotsTxtExtra(
    'Crawl-delay: 2\n<script>bad</script>\nDisallow: /private-beta'
  );
  assert.equal(cleaned.includes('<script>'), false);

  const robots = buildRobotsTxt({
    origin: 'https://bangla-ai.pro',
    extraRules: cleaned,
  });

  assert.ok(robots.includes('User-agent: *'));
  assert.ok(robots.includes('Allow: /'));
  assert.ok(robots.includes('Disallow: /api/'));
  assert.ok(robots.includes('Disallow: /admin'));
  assert.ok(robots.includes('Disallow: /workspace'));
  assert.ok(robots.includes('Crawl-delay: 2'));
  assert.ok(robots.includes('Disallow: /private-beta'));
  assert.ok(robots.includes('Sitemap: https://bangla-ai.pro/sitemap.xml'));
});

test('injectTechnicalSeoIntoHtml injects and cleans GSC verification meta and GA4 gtag scripts', () => {
  const baseHtml = `<!doctype html><html><head><title>Bangla AI</title></head><body></body></html>`;

  const withTracking = injectTechnicalSeoIntoHtml(baseHtml, {
    gscVerificationCode: 'GscToken_BanglaAI_2026',
    ga4MeasurementId: 'G-BANGLA2026',
    ga4Enabled: true,
  });

  assert.ok(
    withTracking.includes(
      `<meta name="${GSC_VERIFICATION_META_NAME}" content="GscToken_BanglaAI_2026" />`
    )
  );
  assert.ok(withTracking.includes(`id="${GA4_SRC_SCRIPT_ID}"`));
  assert.ok(
    withTracking.includes('https://www.googletagmanager.com/gtag/js?id=G-BANGLA2026')
  );
  assert.ok(withTracking.includes(`id="${GA4_INIT_SCRIPT_ID}"`));

  // Injecting again should not duplicate tags
  const reinjected = injectTechnicalSeoIntoHtml(withTracking, {
    gscVerificationCode: 'GscToken_BanglaAI_2026',
    ga4MeasurementId: 'G-BANGLA2026',
    ga4Enabled: true,
  });
  assert.equal(reinjected.split(GA4_SRC_SCRIPT_ID).length - 1, 1);
  assert.equal(reinjected.split(GSC_VERIFICATION_META_NAME).length - 1, 1);

  // Turning off GA4 and clearing GSC removes tags cleanly
  const cleared = injectTechnicalSeoIntoHtml(reinjected, {
    gscVerificationCode: '',
    ga4MeasurementId: 'G-BANGLA2026',
    ga4Enabled: false,
  });
  assert.equal(cleared.includes(GA4_SRC_SCRIPT_ID), false);
  assert.equal(cleared.includes(GA4_INIT_SCRIPT_ID), false);
  assert.equal(cleared.includes(GSC_VERIFICATION_META_NAME), false);
});

test('syncGscMetaTagInDocument upserts and removes GSC meta tag in DOM', () => {
  const nodes: Array<{ tagName: string; attrs: Record<string, string>; remove: () => void }> = [];
  const createEl = (tagName: string) => {
    const el = {
      tagName: tagName.toLowerCase(),
      attrs: {} as Record<string, string>,
      setAttribute(k: string, v: string) {
        this.attrs[k] = v;
      },
      getAttribute(k: string) {
        return this.attrs[k] ?? null;
      },
      remove() {
        const idx = nodes.indexOf(this);
        if (idx >= 0) nodes.splice(idx, 1);
      },
    };
    return el;
  };
  const mockDoc = {
    head: {
      appendChild(node: any) {
        nodes.push(node);
      },
    },
    querySelector(selector: string) {
      const m = selector.match(/^meta\[name="([^"]+)"\]$/);
      if (!m) return null;
      return nodes.find((n) => n.tagName === 'meta' && n.attrs.name === m[1]) || null;
    },
    getElementById() {
      return null;
    },
    createElement: createEl,
  };

  syncGscMetaTagInDocument(mockDoc, 'VerifyCode_123456');
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].attrs.name, GSC_VERIFICATION_META_NAME);
  assert.equal(nodes[0].attrs.content, 'VerifyCode_123456');

  syncGscMetaTagInDocument(mockDoc, 'UpdatedCode_999999');
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].attrs.content, 'UpdatedCode_999999');

  syncGscMetaTagInDocument(mockDoc, '');
  assert.equal(nodes.length, 0);
});
