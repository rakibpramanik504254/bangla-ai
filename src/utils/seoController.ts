import {
  DEFAULT_CANONICAL_ORIGIN,
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  normalizeCanonicalOrigin,
  resolveOgImageUrl,
} from './seo.ts';

export type TwitterCardType = 'summary_large_image' | 'summary';

export interface FaqSchemaItem {
  id: string;
  question: string;
  answer: string;
}

export interface PageSeoConfig {
  slug: string;
  pageLabel: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  ogImageUrl: string;
  twitterCard: TwitterCardType;
  twitterTitle: string;
  twitterDescription: string;
  twitterHandle: string;
  canonicalOverride: string;
  noIndex: boolean;
  noFollow: boolean;
  faqSchemaEnabled: boolean;
  faqItems: FaqSchemaItem[];
  updatedAt?: string;
}

export function normalizePageSlug(raw: string): string {
  const trimmed = (raw || '').trim().toLowerCase();
  if (!trimmed || trimmed === '/') return '/';
  const withoutHashOrQuery = trimmed.split('#')[0].split('?')[0];
  const withLeadingSlash = withoutHashOrQuery.startsWith('/')
    ? withoutHashOrQuery
    : `/${withoutHashOrQuery}`;
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return collapsed || '/';
}

export interface LengthEvaluation {
  length: number;
  min: number;
  max: number;
  status: 'empty' | 'short' | 'optimal' | 'long';
}

export function evaluateSeoLength(
  value: string,
  min: number,
  max: number
): LengthEvaluation {
  const length = (value || '').trim().length;
  if (length === 0) {
    return { length, min, max, status: 'empty' };
  }
  if (length < min) {
    return { length, min, max, status: 'short' };
  }
  if (length > max) {
    return { length, min, max, status: 'long' };
  }
  return { length, min, max, status: 'optimal' };
}

export interface KeywordMatchSummary {
  hasKeyword: boolean;
  inTitle: boolean;
  inDescription: boolean;
  inSlug: boolean;
}

export function checkFocusKeywordMatches(
  keyword: string,
  title: string,
  description: string,
  slug: string
): KeywordMatchSummary {
  const normalizedKeyword = (keyword || '').trim().toLowerCase();
  if (!normalizedKeyword) {
    return {
      hasKeyword: false,
      inTitle: false,
      inDescription: false,
      inSlug: false,
    };
  }
  const slugTokens = normalizePageSlug(slug).replace(/[^a-z0-9]+/g, ' ').trim();
  const keywordAsWords = normalizedKeyword.replace(/[^a-z0-9\u0980-\u09ff]+/g, ' ').trim();

  return {
    hasKeyword: true,
    inTitle: (title || '').toLowerCase().includes(normalizedKeyword),
    inDescription: (description || '').toLowerCase().includes(normalizedKeyword),
    inSlug: Boolean(keywordAsWords && slugTokens.includes(keywordAsWords)),
  };
}

export function resolveEffectiveCanonicalUrl(
  slug: string,
  canonicalOverride?: string,
  origin: string = DEFAULT_CANONICAL_ORIGIN
): string {
  const override = (canonicalOverride || '').trim();
  if (override) return override;
  const cleanOrigin = normalizeCanonicalOrigin(origin);
  const cleanSlug = normalizePageSlug(slug);
  return cleanSlug === '/' ? cleanOrigin : `${cleanOrigin}${cleanSlug}`;
}

export function buildFaqPageJsonLd(
  items: FaqSchemaItem[],
  canonicalUrl: string
): Record<string, unknown> | null {
  const validItems = items
    .map((item) => ({
      question: (item.question || '').trim(),
      answer: (item.answer || '').trim(),
    }))
    .filter((item) => item.question.length > 0 && item.answer.length > 0);

  if (validItems.length === 0) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntityOfPage: canonicalUrl,
    mainEntity: validItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export const RECOMMENDED_BANGLA_AI_FAQS: FaqSchemaItem[] = [
  {
    id: 'faq-1',
    question: 'What is Bangla AI (bangla-ai.pro)?',
    answer:
      'Bangla AI is an independent unified AI workspace in Bangladesh providing access to GPT-6 Astra, Claude Fable 5.2, Gemini 4 Carbon, Grok 4.7, DeepSeek V4.1, and Kimi K3.1 under a single BDT subscription.',
  },
  {
    id: 'faq-2',
    question: 'How can I subscribe to Bangla AI from Bangladesh?',
    answer:
      'You can pay easily in Bangladeshi Taka (৳699/month or ৳5,999/year) via bKash, Nagad, or Rocket without needing an international dual-currency card.',
  },
];

export const DEFAULT_PAGE_SEO_PRESETS: PageSeoConfig[] = [
  {
    slug: '/',
    pageLabel: 'Home (Landing Page)',
    metaTitle: DEFAULT_SEO_TITLE,
    metaDescription: DEFAULT_SEO_DESCRIPTION,
    focusKeyword: 'bangla ai',
    ogImageUrl: DEFAULT_OG_IMAGE_PATH,
    twitterCard: 'summary_large_image',
    twitterTitle: '',
    twitterDescription: '',
    twitterHandle: '@banglaaipro',
    canonicalOverride: '',
    noIndex: false,
    noFollow: false,
    faqSchemaEnabled: true,
    faqItems: RECOMMENDED_BANGLA_AI_FAQS,
  },
  {
    slug: '/about',
    pageLabel: 'About Us',
    metaTitle: 'About Bangla AI — All-in-One AI Workspace for Bangladesh',
    metaDescription:
      'Learn how Bangla-AI.pro brings top global AI models together with bKash, Nagad & Rocket billing for Bangladeshi professionals and students.',
    focusKeyword: 'bangla ai',
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
  },
  {
    slug: '/contact',
    pageLabel: 'Contact & Support',
    metaTitle: 'Contact Bangla AI Support — 24/7 Local Help Desk',
    metaDescription:
      'Need help with your Bangla AI subscription or bKash/Nagad verification? Reach our Dhaka support team via WhatsApp or email.',
    focusKeyword: 'bangla ai support',
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
  },
  {
    slug: '/privacy-policy',
    pageLabel: 'Privacy Policy',
    metaTitle: 'Privacy Policy — Bangla-AI.pro',
    metaDescription:
      'Read how Bangla AI protects your chat history, account security, and encrypted billing metadata.',
    focusKeyword: 'bangla ai privacy',
    ogImageUrl: DEFAULT_OG_IMAGE_PATH,
    twitterCard: 'summary',
    twitterTitle: '',
    twitterDescription: '',
    twitterHandle: '@banglaaipro',
    canonicalOverride: '',
    noIndex: false,
    noFollow: false,
    faqSchemaEnabled: false,
    faqItems: [],
  },
  {
    slug: '/terms',
    pageLabel: 'Terms & Conditions',
    metaTitle: 'Terms & Conditions — Bangla-AI.pro',
    metaDescription:
      'Review subscription terms, fair usage token limits, and service guidelines for Bangla-AI.pro.',
    focusKeyword: 'bangla ai terms',
    ogImageUrl: DEFAULT_OG_IMAGE_PATH,
    twitterCard: 'summary',
    twitterTitle: '',
    twitterDescription: '',
    twitterHandle: '@banglaaipro',
    canonicalOverride: '',
    noIndex: false,
    noFollow: false,
    faqSchemaEnabled: false,
    faqItems: [],
  },
  {
    slug: '/refund-policy',
    pageLabel: 'Refund Policy',
    metaTitle: 'Refund Policy — Bangla-AI.pro',
    metaDescription:
      'Understand eligibility and processing timelines for bKash, Nagad, and Rocket subscription refunds on Bangla-AI.pro.',
    focusKeyword: 'bangla ai refund',
    ogImageUrl: DEFAULT_OG_IMAGE_PATH,
    twitterCard: 'summary',
    twitterTitle: '',
    twitterDescription: '',
    twitterHandle: '@banglaaipro',
    canonicalOverride: '',
    noIndex: false,
    noFollow: false,
    faqSchemaEnabled: false,
    faqItems: [],
  },
  {
    slug: '/security',
    pageLabel: 'Security Standards',
    metaTitle: 'Security & Encryption Standards — Bangla-AI.pro',
    metaDescription:
      'Explore TLS encryption, token isolation, and Google/email account recovery safeguards powering Bangla-AI.pro.',
    focusKeyword: 'bangla ai security',
    ogImageUrl: DEFAULT_OG_IMAGE_PATH,
    twitterCard: 'summary',
    twitterTitle: '',
    twitterDescription: '',
    twitterHandle: '@banglaaipro',
    canonicalOverride: '',
    noIndex: false,
    noFollow: false,
    faqSchemaEnabled: false,
    faqItems: [],
  },
];

const BUILT_IN_SLUG_ORDER = new Map(
  DEFAULT_PAGE_SEO_PRESETS.map((preset, idx) => [preset.slug, idx])
);

const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g;

function sanitizePlainText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL_CHARS_RE, ' ').trim().slice(0, maxLen);
}

export function derivePageLabelFromSlug(slug: string): string {
  const cleanSlug = normalizePageSlug(slug);
  if (cleanSlug === '/') return 'Home (Landing Page)';
  return cleanSlug
    .replace(/^\//, '')
    .split('/')
    .map((segment) =>
      segment
        .split('-')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .filter(Boolean)
    .join(' › ') || 'Custom Page';
}

export function isBuiltInSeoSlug(slug: string): boolean {
  return BUILT_IN_SLUG_ORDER.has(normalizePageSlug(slug));
}

export function getDefaultPresetForSlug(slug: string): PageSeoConfig | undefined {
  const normalized = normalizePageSlug(slug);
  const found = DEFAULT_PAGE_SEO_PRESETS.find((p) => p.slug === normalized);
  if (!found) return undefined;
  return {
    ...found,
    faqItems: found.faqItems.map((item) => ({ ...item })),
  };
}

export function sortPageSeoConfigs(configs: PageSeoConfig[]): PageSeoConfig[] {
  return [...configs].sort((a, b) => {
    const orderA = BUILT_IN_SLUG_ORDER.get(a.slug);
    const orderB = BUILT_IN_SLUG_ORDER.get(b.slug);
    if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
    if (orderA !== undefined) return -1;
    if (orderB !== undefined) return 1;
    return a.slug.localeCompare(b.slug);
  });
}

export type SanitizePageSeoResult =
  | { ok: true; config: PageSeoConfig }
  | { ok: false; error: string };

export function sanitizePageSeoInput(rawInput: unknown): SanitizePageSeoResult {
  if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    return { ok: false, error: 'SEO configuration payload must be an object.' };
  }

  const input = rawInput as Record<string, unknown>;
  const rawSlug = typeof input.slug === 'string' ? input.slug.trim() : '';
  if (!rawSlug && rawSlug !== '/') {
    return { ok: false, error: 'A valid route slug (e.g. "/" or "/about") is required.' };
  }

  if (
    /[<>"'`\\]/.test(rawSlug) ||
    rawSlug.includes('..') ||
    /^(?:javascript|data|vbscript|http|https):/i.test(rawSlug)
  ) {
    return {
      ok: false,
      error: 'Route slug must be a clean relative path like "/about" or "/pricing".',
    };
  }

  const slug = normalizePageSlug(rawSlug);
  if (slug.startsWith('/api/') || slug === '/api') {
    return { ok: false, error: 'API endpoints cannot be registered as SEO routes.' };
  }
  if (slug.length > 160) {
    return { ok: false, error: 'Route slug must be 160 characters or fewer.' };
  }

  const rawOgImage = typeof input.ogImageUrl === 'string' ? input.ogImageUrl.trim() : '';
  let ogImageUrl = DEFAULT_OG_IMAGE_PATH;
  if (rawOgImage) {
    if (/^(?:javascript|data|vbscript):/i.test(rawOgImage)) {
      return {
        ok: false,
        error: 'OG image URL must use https://, http://, or a relative /path.',
      };
    }
    if (rawOgImage.startsWith('//')) {
      return { ok: false, error: 'OG image URL cannot start with "//".' };
    }
    if (rawOgImage.startsWith('/')) {
      ogImageUrl = rawOgImage.slice(0, 500);
    } else {
      try {
        const parsedImg = new URL(rawOgImage);
        if (parsedImg.protocol !== 'http:' && parsedImg.protocol !== 'https:') {
          return {
            ok: false,
            error: 'OG image URL must use http://, https://, or a relative /path.',
          };
        }
        ogImageUrl = rawOgImage.slice(0, 500);
      } catch {
        return {
          ok: false,
          error: 'OG image URL must be a valid https:// URL or relative path starting with "/".',
        };
      }
    }
  }

  const rawCanonical =
    typeof input.canonicalOverride === 'string' ? input.canonicalOverride.trim() : '';
  let canonicalOverride = '';
  if (rawCanonical) {
    try {
      const parsedCanonical = new URL(rawCanonical);
      if (parsedCanonical.protocol !== 'http:' && parsedCanonical.protocol !== 'https:') {
        return {
          ok: false,
          error: 'Canonical URL override must start with https:// or http://.',
        };
      }
      canonicalOverride = parsedCanonical.toString().slice(0, 500);
    } catch {
      return {
        ok: false,
        error: 'Canonical URL override must be a valid https:// or http:// URL.',
      };
    }
  }

  const rawTwitterCard =
    typeof input.twitterCard === 'string' ? input.twitterCard.trim() : '';
  const twitterCard: TwitterCardType =
    rawTwitterCard === 'summary' ? 'summary' : 'summary_large_image';

  const rawHandle = sanitizePlainText(input.twitterHandle, 60).replace(/\s+/g, '');
  const twitterHandle = rawHandle
    ? rawHandle.startsWith('@')
      ? rawHandle
      : `@${rawHandle}`
    : '@banglaaipro';

  const rawFaqItems = Array.isArray(input.faqItems) ? input.faqItems : [];
  const faqItems: FaqSchemaItem[] = [];
  for (let i = 0; i < Math.min(rawFaqItems.length, 50); i++) {
    const entry = rawFaqItems[i];
    if (!entry || typeof entry !== 'object') continue;
    const itemObj = entry as Record<string, unknown>;
    const question = sanitizePlainText(itemObj.question, 300);
    const answer = sanitizePlainText(itemObj.answer, 1500);
    if (!question && !answer) continue;
    const id = sanitizePlainText(itemObj.id, 80) || `faq-${i + 1}`;
    faqItems.push({ id, question, answer });
  }

  const defaultPreset = getDefaultPresetForSlug(slug);
  const pageLabel =
    sanitizePlainText(input.pageLabel, 120) ||
    defaultPreset?.pageLabel ||
    derivePageLabelFromSlug(slug);

  const config: PageSeoConfig = {
    slug,
    pageLabel,
    metaTitle: sanitizePlainText(input.metaTitle, 160),
    metaDescription: sanitizePlainText(input.metaDescription, 320),
    focusKeyword: sanitizePlainText(input.focusKeyword, 100),
    ogImageUrl,
    twitterCard,
    twitterTitle: sanitizePlainText(input.twitterTitle, 160),
    twitterDescription: sanitizePlainText(input.twitterDescription, 320),
    twitterHandle,
    canonicalOverride,
    noIndex: Boolean(input.noIndex),
    noFollow: Boolean(input.noFollow),
    faqSchemaEnabled: Boolean(input.faqSchemaEnabled),
    faqItems,
    updatedAt: new Date().toISOString(),
  };

  return { ok: true, config };
}

export interface ResolvedDynamicPageSeo {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  twitterCard: TwitterCardType;
  twitterTitle: string;
  twitterDescription: string;
  twitterHandle: string;
  robots: string;
  noIndex: boolean;
  noFollow: boolean;
  faqJsonLd: Record<string, unknown> | null;
}

export interface DynamicPageSeoLookupResult {
  slug: string;
  matchedExact: boolean;
  config: PageSeoConfig;
  resolved: ResolvedDynamicPageSeo;
}

export function resolvePageSeoForSlug(
  configs: PageSeoConfig[],
  requestedSlug: string,
  origin: string = DEFAULT_CANONICAL_ORIGIN
): DynamicPageSeoLookupResult {
  const normalizedSlug = normalizePageSlug(requestedSlug);
  const exactFromDb = configs.find((c) => normalizePageSlug(c.slug) === normalizedSlug);
  const presetFallback = getDefaultPresetForSlug(normalizedSlug);
  const rootConfig =
    configs.find((c) => normalizePageSlug(c.slug) === '/') ||
    DEFAULT_PAGE_SEO_PRESETS[0];

  const matchedExact = Boolean(exactFromDb || presetFallback);

  const config: PageSeoConfig = exactFromDb
    ? {
        ...exactFromDb,
        slug: normalizePageSlug(exactFromDb.slug),
        faqItems: Array.isArray(exactFromDb.faqItems)
          ? exactFromDb.faqItems.map((item) => ({ ...item }))
          : [],
      }
    : presetFallback
      ? presetFallback
      : {
          slug: normalizedSlug,
          pageLabel: derivePageLabelFromSlug(normalizedSlug),
          metaTitle: `${derivePageLabelFromSlug(normalizedSlug)} — Bangla-AI.pro`,
          metaDescription: rootConfig.metaDescription || DEFAULT_SEO_DESCRIPTION,
          focusKeyword: rootConfig.focusKeyword || 'bangla ai',
          ogImageUrl: rootConfig.ogImageUrl || DEFAULT_OG_IMAGE_PATH,
          twitterCard: rootConfig.twitterCard || 'summary_large_image',
          twitterTitle: '',
          twitterDescription: '',
          twitterHandle: rootConfig.twitterHandle || '@banglaaipro',
          canonicalOverride: '',
          noIndex: false,
          noFollow: false,
          faqSchemaEnabled: false,
          faqItems: [],
        };

  const canonicalOrigin = normalizeCanonicalOrigin(origin);
  const canonicalUrl = resolveEffectiveCanonicalUrl(
    config.slug,
    config.canonicalOverride,
    canonicalOrigin
  );
  const title = config.metaTitle.trim() || `${config.pageLabel} — Bangla-AI.pro`;
  const description = config.metaDescription.trim() || DEFAULT_SEO_DESCRIPTION;
  const ogImageUrl = resolveOgImageUrl(
    config.ogImageUrl || DEFAULT_OG_IMAGE_PATH,
    canonicalOrigin
  );
  const twitterTitle = config.twitterTitle.trim() || title;
  const twitterDescription = config.twitterDescription.trim() || description;
  const robots = `${config.noIndex ? 'noindex' : 'index'}, ${
    config.noFollow ? 'nofollow' : 'follow'
  }`;
  const faqJsonLd = config.faqSchemaEnabled
    ? buildFaqPageJsonLd(config.faqItems, canonicalUrl)
    : null;

  return {
    slug: config.slug,
    matchedExact,
    config,
    resolved: {
      slug: config.slug,
      title,
      description,
      keywords: config.focusKeyword.trim(),
      canonicalUrl,
      ogTitle: title,
      ogDescription: description,
      ogImageUrl,
      twitterCard: config.twitterCard,
      twitterTitle,
      twitterDescription,
      twitterHandle: config.twitterHandle || '@banglaaipro',
      robots,
      noIndex: config.noIndex,
      noFollow: config.noFollow,
      faqJsonLd,
    },
  };
}
