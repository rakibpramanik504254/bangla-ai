import {
  DEFAULT_CANONICAL_ORIGIN,
  DEFAULT_OG_IMAGE_PATH,
  escapeHtmlAttr,
  normalizeCanonicalOrigin,
} from './seo.ts';
import {
  normalizePageSlug,
  resolvePageSeoForSlug,
  type PageSeoConfig,
  type ResolvedDynamicPageSeo,
} from './seoController.ts';
import type { AiModel } from '../types/index.ts';

export const GSC_VERIFICATION_META_NAME = 'google-site-verification';
export const GA4_SRC_SCRIPT_ID = 'bangla-ai-ga4-src';
export const GA4_INIT_SCRIPT_ID = 'bangla-ai-ga4-init';
export const TECHNICAL_NON_INDEXABLE_SLUGS = new Set(['/workspace', '/account', '/admin']);
export const DEFAULT_ROBOTS_DISALLOW_PATHS = ['/api/', '/admin', '/account', '/workspace'] as const;

const GSC_TOKEN_RE = /^[A-Za-z0-9._-]{8,128}$/;
const GA4_ID_RE = /^G-[A-Z0-9]{6,20}$/;

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    _ga4InitializedId?: string;
  }
}

export type ValidateGscResult =
  | { valid: true; code: string }
  | { valid: false; error: string };

export type ValidateGa4Result =
  | { valid: true; measurementId: string }
  | { valid: false; error: string };

/**
 * Extracts and validates a Google Search Console verification token.
 * Accepts either a raw token (e.g. "abc123_XYZ") or a pasted
 * <meta name="google-site-verification" content="..." /> tag.
 */
export function validateGscVerificationCode(rawInput: unknown): ValidateGscResult {
  if (rawInput === undefined || rawInput === null) {
    return { valid: true, code: '' };
  }
  const raw = String(rawInput).trim();
  if (!raw) {
    return { valid: true, code: '' };
  }

  let candidate = raw;
  const metaMatch = raw.match(/content\s*=\s*["']([^"']+)["']/i);
  if (metaMatch && /google-site-verification/i.test(raw)) {
    candidate = metaMatch[1].trim();
  }

  if (!GSC_TOKEN_RE.test(candidate)) {
    return {
      valid: false,
      error:
        'Google Search Console verification code must be 8–128 characters (letters, numbers, ".", "_", or "-"), or paste the full <meta name="google-site-verification"> tag.',
    };
  }

  return { valid: true, code: candidate };
}

/**
 * Extracts and validates a Google Analytics 4 Measurement ID (G-XXXXXXXXXX).
 * Accepts either the bare ID or a pasted gtag.js script snippet containing ?id=G-... or 'G-...'.
 */
export function validateGa4MeasurementId(rawInput: unknown): ValidateGa4Result {
  if (rawInput === undefined || rawInput === null) {
    return { valid: true, measurementId: '' };
  }
  const raw = String(rawInput).trim();
  if (!raw) {
    return { valid: true, measurementId: '' };
  }

  let candidate = raw;
  const embeddedMatch = raw.match(/\b(G-[A-Z0-9]{6,20})\b/i);
  if (embeddedMatch && (raw.includes('<script') || raw.includes('gtag') || raw.includes('googletagmanager'))) {
    candidate = embeddedMatch[1];
  }

  candidate = candidate.toUpperCase();
  if (!GA4_ID_RE.test(candidate)) {
    return {
      valid: false,
      error: 'GA4 Measurement ID must follow the format G-XXXXXXXXXX (e.g. G-1A2B3C4D5E).',
    };
  }

  return { valid: true, measurementId: candidate };
}

export function sanitizeRobotsTxtExtra(rawInput: unknown): string {
  if (typeof rawInput !== 'string') return '';
  const cleanedLines = rawInput
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .split('\n')
    .map((line) => line.replace(/<\/?[a-z][^>]*>/gi, '').trimEnd())
    .slice(0, 60);

  return cleanedLines.join('\n').trim().slice(0, 4000);
}

export function toModelSeoSlug(
  model: Pick<AiModel, 'id' | 'display_name' | 'model_name' | 'default_name'>
): string {
  const source = (model.display_name || model.default_name || model.model_name || model.id || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const slugPart = source || model.id.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return `/models/${slugPart.slice(0, 80)}`;
}

export function findModelBySeoSlug(models: AiModel[], slug: string): AiModel | undefined {
  const normalized = normalizePageSlug(slug);
  if (!normalized.startsWith('/models/')) return undefined;
  return models.find((m) => m.is_enabled !== false && toModelSeoSlug(m) === normalized);
}

export function buildDynamicModelSeoConfig(model: AiModel): PageSeoConfig {
  const slug = toModelSeoSlug(model);
  const cleanName = (model.display_name || model.model_name).trim();
  const descBase = (model.description_en || model.default_description || '').trim();
  const metaDescription = descBase
    ? `${cleanName} on Bangla-AI.pro: ${descBase}`.slice(0, 160)
    : `Use ${cleanName} in Bangla and English with unified workspace memory on Bangla-AI.pro. Pay easily via bKash, Nagad & Rocket.`;

  return {
    slug,
    pageLabel: cleanName,
    metaTitle: `${cleanName} — Bangla AI Workspace | Bangla-AI.pro`.slice(0, 70),
    metaDescription,
    focusKeyword: `bangla ai ${cleanName.toLowerCase()}`,
    ogImageUrl: DEFAULT_OG_IMAGE_PATH,
    twitterCard: 'summary_large_image',
    twitterTitle: '',
    twitterDescription: '',
    twitterHandle: '@banglaaipro',
    canonicalOverride: '',
    noIndex: false,
    noFollow: false,
    faqSchemaEnabled: false,
    faqItems: [],
    updatedAt: model.created_at,
  };
}

export function resolvePageOrModelSeo(
  configs: PageSeoConfig[],
  models: AiModel[],
  requestedSlug: string,
  origin: string = DEFAULT_CANONICAL_ORIGIN
): {
  slug: string;
  matchedExact: boolean;
  matchedModel?: AiModel;
  config: PageSeoConfig;
  resolved: ResolvedDynamicPageSeo;
} {
  const normalized = normalizePageSlug(requestedSlug);
  const exactInDb = configs.find((c) => normalizePageSlug(c.slug) === normalized);
  if (exactInDb) {
    const lookup = resolvePageSeoForSlug(configs, normalized, origin);
    return { ...lookup, matchedExact: true };
  }

  const matchedModel = findModelBySeoSlug(models, normalized);
  if (matchedModel) {
    const modelConfig = buildDynamicModelSeoConfig(matchedModel);
    const lookup = resolvePageSeoForSlug([...configs, modelConfig], normalized, origin);
    return {
      ...lookup,
      matchedExact: true,
      matchedModel,
    };
  }

  return resolvePageSeoForSlug(configs, normalized, origin);
}

export interface SitemapUrlEntry {
  loc: string;
  lastmod: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
  source: 'page' | 'model';
  label: string;
}

function formatIsoDate(rawDate?: string, fallbackDate: Date = new Date()): string {
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return fallbackDate.toISOString().slice(0, 10);
}

export function escapeXmlText(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const LEGAL_SLUGS = new Set(['/privacy-policy', '/terms', '/refund-policy', '/security']);

export function collectSitemapEntries(params: {
  pageConfigs: PageSeoConfig[];
  models: AiModel[];
  origin?: string;
  now?: Date;
}): SitemapUrlEntry[] {
  const origin = normalizeCanonicalOrigin(params.origin);
  const now = params.now || new Date();
  const entries: SitemapUrlEntry[] = [];
  const seenLocs = new Set<string>();
  const explicitlyConfiguredModelSlugs = new Map<string, PageSeoConfig>();

  for (const cfg of params.pageConfigs) {
    const slug = normalizePageSlug(cfg.slug);
    if (slug.startsWith('/models/')) {
      explicitlyConfiguredModelSlugs.set(slug, cfg);
    }
    if (cfg.noIndex || TECHNICAL_NON_INDEXABLE_SLUGS.has(slug)) {
      continue;
    }

    let loc = slug === '/' ? `${origin}/` : `${origin}${slug}`;
    const override = (cfg.canonicalOverride || '').trim();
    if (override) {
      try {
        const parsedOverride = new URL(override);
        if (parsedOverride.origin !== origin) {
          // Canonical points externally; do not emit external canonical URL in our sitemap.
          continue;
        }
        loc = parsedOverride.toString();
      } catch {
        // Ignore malformed canonical override and keep origin + slug
      }
    }

    if (seenLocs.has(loc)) continue;
    seenLocs.add(loc);

    const changefreq: SitemapUrlEntry['changefreq'] =
      slug === '/' ? 'daily' : LEGAL_SLUGS.has(slug) ? 'monthly' : 'weekly';
    const priority =
      slug === '/'
        ? '1.0'
        : LEGAL_SLUGS.has(slug)
          ? '0.5'
          : slug === '/about' || slug === '/contact'
            ? '0.8'
            : '0.9';

    entries.push({
      loc,
      lastmod: formatIsoDate(cfg.updatedAt, now),
      changefreq,
      priority,
      source: 'page',
      label: cfg.pageLabel || slug,
    });
  }

  for (const model of params.models) {
    if (model.is_enabled === false) continue;
    const modelSlug = toModelSeoSlug(model);
    const explicitOverride = explicitlyConfiguredModelSlugs.get(modelSlug);
    if (explicitOverride?.noIndex) continue;

    const loc = `${origin}${modelSlug}`;
    if (seenLocs.has(loc)) continue;
    seenLocs.add(loc);

    entries.push({
      loc,
      lastmod: formatIsoDate(model.created_at, now),
      changefreq: 'weekly',
      priority: '0.8',
      source: 'model',
      label: model.display_name || model.model_name,
    });
  }

  return entries;
}

export function buildSitemapXml(entries: SitemapUrlEntry[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const entry of entries) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXmlText(entry.loc)}</loc>`);
    lines.push(`    <lastmod>${escapeXmlText(entry.lastmod)}</lastmod>`);
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    lines.push(`    <priority>${entry.priority}</priority>`);
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  return lines.join('\n');
}

export function buildRobotsTxt(params?: {
  origin?: string;
  extraRules?: string;
}): string {
  const origin = normalizeCanonicalOrigin(params?.origin);
  const extra = sanitizeRobotsTxtExtra(params?.extraRules);

  const lines: string[] = [
    '# Bangla-AI.pro Technical SEO Robots Rules',
    'User-agent: *',
    'Allow: /',
    ...DEFAULT_ROBOTS_DISALLOW_PATHS.map((p) => `Disallow: ${p}`),
  ];

  if (extra) {
    lines.push('');
    lines.push('# Custom Admin Directives');
    lines.push(extra);
  }

  lines.push('');
  lines.push(`Sitemap: ${origin}/sitemap.xml`);
  return lines.join('\n');
}

export function buildGa4SnippetScriptContent(measurementId: string): string {
  const safeId = JSON.stringify(measurementId);
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',${safeId},{anonymize_ip:true,send_page_view:true});`;
}

export function injectTechnicalSeoIntoHtml(
  html: string,
  options: {
    gscVerificationCode?: string;
    ga4MeasurementId?: string;
    ga4Enabled?: boolean;
  }
): string {
  let output = html;

  const gscCheck = validateGscVerificationCode(options.gscVerificationCode);
  const gscCode = gscCheck.valid ? gscCheck.code : '';
  const gscPattern = /\s*<meta\s+name=["']google-site-verification["'][^>]*>\s*/gi;

  if (gscCode) {
    const gscTag = `<meta name="${GSC_VERIFICATION_META_NAME}" content="${escapeHtmlAttr(gscCode)}" />`;
    if (gscPattern.test(output)) {
      output = output.replace(gscPattern, () => `\n    ${gscTag}\n`);
    } else if (output.includes('</head>')) {
      output = output.replace('</head>', () => `    ${gscTag}\n  </head>`);
    } else {
      output = `${output}\n${gscTag}`;
    }
  } else {
    output = output.replace(gscPattern, '\n');
  }

  const gaCheck = validateGa4MeasurementId(options.ga4MeasurementId);
  const activeGa4Id =
    options.ga4Enabled && gaCheck.valid && gaCheck.measurementId ? gaCheck.measurementId : '';

  const gaSrcPattern = new RegExp(
    `\\s*<script[^>]*id=["']${GA4_SRC_SCRIPT_ID}["'][^>]*>[\\s\\S]*?<\\/script>\\s*`,
    'gi'
  );
  const gaInitPattern = new RegExp(
    `\\s*<script[^>]*id=["']${GA4_INIT_SCRIPT_ID}["'][^>]*>[\\s\\S]*?<\\/script>\\s*`,
    'gi'
  );

  output = output.replace(gaSrcPattern, '\n').replace(gaInitPattern, '\n');

  if (activeGa4Id) {
    const safeGaSrc = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(activeGa4Id)}`;
    const gaTags = [
      `<script id="${GA4_SRC_SCRIPT_ID}" async src="${escapeHtmlAttr(safeGaSrc)}"></script>`,
      `<script id="${GA4_INIT_SCRIPT_ID}">${buildGa4SnippetScriptContent(activeGa4Id)}</script>`,
    ].join('\n    ');

    if (output.includes('</head>')) {
      output = output.replace('</head>', () => `    ${gaTags}\n  </head>`);
    } else {
      output = `${output}\n${gaTags}`;
    }
  }

  return output;
}

export interface MinimalHeadDocument {
  head: {
    appendChild(node: any): void;
  };
  querySelector(selector: string): any;
  getElementById(id: string): any;
  createElement(tagName: string): any;
}

export function syncGscMetaTagInDocument(
  doc: MinimalHeadDocument | null | undefined,
  rawCode?: string
): void {
  if (!doc) return;
  const check = validateGscVerificationCode(rawCode);
  const code = check.valid ? check.code : '';
  const selector = `meta[name="${GSC_VERIFICATION_META_NAME}"]`;
  const existing = doc.querySelector(selector);

  if (!code) {
    if (existing) existing.remove();
    return;
  }

  if (existing) {
    existing.setAttribute('content', code);
    return;
  }

  const meta = doc.createElement('meta');
  meta.setAttribute('name', GSC_VERIFICATION_META_NAME);
  meta.setAttribute('content', code);
  doc.head.appendChild(meta);
}

export function initGa4Analytics(rawMeasurementId: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const check = validateGa4MeasurementId(rawMeasurementId);
  if (!check.valid || !check.measurementId) return;
  const measurementId = check.measurementId;

  if (window._ga4InitializedId === measurementId) return;

  try {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
    }

    if (!document.getElementById(GA4_SRC_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = GA4_SRC_SCRIPT_ID;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.appendChild(script);
    }

    if (!document.getElementById(GA4_INIT_SCRIPT_ID)) {
      window.gtag('js', new Date());
      window.gtag('config', measurementId, {
        anonymize_ip: true,
        send_page_view: true,
      });
    }

    window._ga4InitializedId = measurementId;
  } catch (err) {
    console.warn('[GA4] Initialization skipped or blocked:', err);
  }
}

export function trackGa4PageView(pagePath: string, pageTitle?: string): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  if (!window._ga4InitializedId) return;
  try {
    window.gtag('event', 'page_view', {
      page_path: pagePath || '/',
      page_title: pageTitle || (typeof document !== 'undefined' ? document.title : ''),
      page_location: window.location.href,
    });
  } catch (err) {
    console.warn('[GA4] Failed to track page_view:', err);
  }
}
