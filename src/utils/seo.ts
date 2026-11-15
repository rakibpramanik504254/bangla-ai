export const DEFAULT_CANONICAL_ORIGIN = 'https://bangla-ai.pro';
export const DEFAULT_SEO_SITE_NAME = 'Bangla-AI.pro';
export const DEFAULT_SEO_TITLE =
  'Bangla-AI.pro — বাংলাদেশের সেরা অল-ইন-ওয়ান AI প্ল্যাটফর্ম';
export const DEFAULT_SEO_DESCRIPTION =
  'একই সাবস্ক্রিপশনে ব্যবহার করুন ChatGPT, Claude, Gemini, Grok ও DeepSeek। বিকাশ ও নগদে সহজ পেমেন্টে শুরু করুন আজই।';
export const DEFAULT_OG_IMAGE_PATH = '/og-banner.png';
export const CUSTOM_OG_IMAGE_PATH = '/api/seo/og-banner';

export interface SeoSettingsFields {
  seo_title?: string;
  seo_description?: string;
  seo_og_image_url?: string;
  seo_og_image_data?: string;
}

export interface ResolvedSeoMeta {
  title: string;
  description: string;
  siteName: string;
  canonicalUrl: string;
  ogUrl: string;
  ogImageUrl: string;
  rawImagePathOrUrl: string;
  imageWidth: string;
  imageHeight: string;
}

export function normalizeCanonicalOrigin(rawOrigin?: string): string {
  const candidate = (rawOrigin || '').trim();
  if (!candidate) return DEFAULT_CANONICAL_ORIGIN;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
  } catch {
    // Fallback to default origin
  }
  return DEFAULT_CANONICAL_ORIGIN;
}

export function resolveOgImageUrl(
  rawImage?: string,
  canonicalOrigin: string = DEFAULT_CANONICAL_ORIGIN
): string {
  const origin = normalizeCanonicalOrigin(canonicalOrigin);
  const trimmed = (rawImage || '').trim();
  if (!trimmed) {
    return `${origin}${DEFAULT_OG_IMAGE_PATH}`;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `${origin}${trimmed}`;
  }
  return `${origin}/${trimmed}`;
}

export function resolveBrowserPreviewImageUrl(rawImage?: string): string {
  const trimmed = (rawImage || '').trim();
  if (!trimmed) return DEFAULT_OG_IMAGE_PATH;
  if (/^(https?:\/\/|\/|data:image\/)/i.test(trimmed)) {
    return trimmed;
  }
  return `/${trimmed}`;
}

export function resolveSeoMetadata(
  settings?: SeoSettingsFields | null,
  rawOrigin?: string
): ResolvedSeoMeta {
  const origin = normalizeCanonicalOrigin(rawOrigin);
  const title = (settings?.seo_title || '').trim() || DEFAULT_SEO_TITLE;
  const description = (settings?.seo_description || '').trim() || DEFAULT_SEO_DESCRIPTION;
  const rawImagePathOrUrl =
    (settings?.seo_og_image_url || '').trim() || DEFAULT_OG_IMAGE_PATH;
  const ogImageUrl = resolveOgImageUrl(rawImagePathOrUrl, origin);

  return {
    title,
    description,
    siteName: DEFAULT_SEO_SITE_NAME,
    canonicalUrl: origin,
    ogUrl: origin,
    ogImageUrl,
    rawImagePathOrUrl,
    imageWidth: '1200',
    imageHeight: '630'
  };
}

export function escapeHtmlText(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeHtmlAttr(value: string): string {
  return escapeHtmlText(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function parseDataUrlImage(
  dataUrl: string,
  maxBytes: number = 4 * 1024 * 1024
): { mimeType: string; buffer: Buffer } | null {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl
    .trim()
    .match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return null;
  const rawMime = match[1].toLowerCase();
  const mimeType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > maxBytes) {
    return null;
  }
  return { mimeType, buffer };
}

function replaceOrInsertTag(
  html: string,
  pattern: RegExp,
  replacementTag: string
): string {
  if (pattern.test(html)) {
    return html.replace(pattern, () => replacementTag);
  }
  if (html.includes('</head>')) {
    return html.replace('</head>', () => `    ${replacementTag}\n  </head>`);
  }
  return `${html}\n${replacementTag}`;
}

export function buildStructuredDataJson(meta: ResolvedSeoMeta): string {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: meta.siteName,
    url: meta.canonicalUrl,
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'All',
    description: meta.description,
    image: meta.ogImageUrl,
    offers: {
      '@type': 'Offer',
      price: '699',
      priceCurrency: 'BDT'
    }
  };
  return JSON.stringify(payload).replace(/</g, '\\u003c');
}

export function injectSeoMetaIntoHtml(html: string, meta: ResolvedSeoMeta): string {
  const safeTitle = escapeHtmlText(meta.title);
  const safeTitleAttr = escapeHtmlAttr(meta.title);
  const safeDescAttr = escapeHtmlAttr(meta.description);
  const safeSiteAttr = escapeHtmlAttr(meta.siteName);
  const safeUrlAttr = escapeHtmlAttr(meta.ogUrl);
  const safeCanonicalAttr = escapeHtmlAttr(meta.canonicalUrl);
  const safeImageAttr = escapeHtmlAttr(meta.ogImageUrl);

  let output = html;

  output = replaceOrInsertTag(
    output,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${safeTitle}</title>`
  );
  output = replaceOrInsertTag(
    output,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${safeDescAttr}" />`
  );
  output = replaceOrInsertTag(
    output,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${safeCanonicalAttr}" />`
  );
  output = replaceOrInsertTag(
    output,
    /<meta\s+property=["']og:type["'][^>]*>/i,
    `<meta property="og:type" content="website" />`
  );
  output = replaceOrInsertTag(
    output,
    /<meta\s+property=["']og:site_name["'][^>]*>/i,
    `<meta property="og:site_name" content="${safeSiteAttr}" />`
  );
  output = replaceOrInsertTag(
    output,
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${safeUrlAttr}" />`
  );
  output = replaceOrInsertTag(
    output,
    /<meta\s+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${safeTitleAttr}" />`
  );
  output = replaceOrInsertTag(
    output,
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${safeDescAttr}" />`
  );
  output = replaceOrInsertTag(
    output,
    /<meta\s+property=["']og:image["'][^>]*>/i,
    `<meta property="og:image" content="${safeImageAttr}" />`
  );
  output = replaceOrInsertTag(
    output,
    /<meta\s+property=["']og:image:width["'][^>]*>/i,
    `<meta property="og:image:width" content="${meta.imageWidth}" />`
  );
  output = replaceOrInsertTag(
    output,
    /<meta\s+property=["']og:image:height["'][^>]*>/i,
    `<meta property="og:image:height" content="${meta.imageHeight}" />`
  );
  output = replaceOrInsertTag(
    output,
    /<meta\s+name=["']twitter:card["'][^>]*>/i,
    `<meta name="twitter:card" content="summary_large_image" />`
  );
  output = replaceOrInsertTag(
    output,
    /<meta\s+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${safeTitleAttr}" />`
  );
  output = replaceOrInsertTag(
    output,
    /<meta\s+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${safeDescAttr}" />`
  );
  output = replaceOrInsertTag(
    output,
    /<meta\s+name=["']twitter:image["'][^>]*>/i,
    `<meta name="twitter:image" content="${safeImageAttr}" />`
  );

  const jsonLdTag = `<script id="bangla-ai-ld-json" type="application/ld+json">${buildStructuredDataJson(
    meta
  )}</script>`;
  output = replaceOrInsertTag(
    output,
    /<script[^>]*id=["']bangla-ai-ld-json["'][^>]*>[\s\S]*?<\/script>/i,
    jsonLdTag
  );

  return output;
}
