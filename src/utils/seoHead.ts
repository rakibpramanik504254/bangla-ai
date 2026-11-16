import type { AppView } from './navigation.ts';
import {
  DEFAULT_SEO_SITE_NAME,
  escapeHtmlAttr,
  escapeHtmlText,
  resolveSeoMetadata,
  injectSeoMetaIntoHtml,
} from './seo.ts';
import {
  DEFAULT_PAGE_SEO_PRESETS,
  normalizePageSlug,
  resolvePageSeoForSlug,
  type ResolvedDynamicPageSeo,
} from './seoController.ts';

export const FAQ_JSON_LD_SCRIPT_ID = 'bangla-ai-faq-ld-json';
export const NON_INDEXABLE_APP_SLUGS = new Set(['/workspace', '/account', '/admin']);

export function resolveActiveSeoSlug(view: AppView, pathname: string = '/'): string {
  switch (view) {
    case 'about':
      return '/about';
    case 'contact':
      return '/contact';
    case 'privacy':
      return '/privacy-policy';
    case 'terms':
      return '/terms';
    case 'refund':
      return '/refund-policy';
    case 'security':
      return '/security';
    case 'chat':
      return '/workspace';
    case 'account':
      return '/account';
    case 'admin':
      return '/admin';
    case 'home':
    default: {
      const normalized = normalizePageSlug(pathname);
      return normalized || '/';
    }
  }
}

export function applyAppViewFallbackOverrides(
  resolved: ResolvedDynamicPageSeo,
  view: AppView,
  matchedExact: boolean
): ResolvedDynamicPageSeo {
  if (matchedExact) return resolved;

  if (view === 'chat') {
    return {
      ...resolved,
      title: 'AI Workspace — Bangla-AI.pro',
      robots: 'noindex, nofollow',
      noIndex: true,
      noFollow: true,
    };
  }
  if (view === 'account') {
    return {
      ...resolved,
      title: 'Account & Billing — Bangla-AI.pro',
      robots: 'noindex, nofollow',
      noIndex: true,
      noFollow: true,
    };
  }
  if (view === 'admin') {
    return {
      ...resolved,
      title: 'Admin Console — Bangla-AI.pro',
      robots: 'noindex, nofollow',
      noIndex: true,
      noFollow: true,
    };
  }
  return resolved;
}

export function buildOptimisticPageSeoFallback(
  slug: string,
  view: AppView,
  origin?: string
): ResolvedDynamicPageSeo {
  const lookup = resolvePageSeoForSlug(DEFAULT_PAGE_SEO_PRESETS, slug, origin);
  return applyAppViewFallbackOverrides(lookup.resolved, view, lookup.matchedExact);
}

export interface HeadElementLike {
  tagName?: string;
  id?: string;
  textContent: string | null;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  remove(): void;
}

export interface HeadDocumentLike {
  title: string;
  head: {
    appendChild(node: HeadElementLike): void;
  };
  querySelector(selector: string): HeadElementLike | null;
  getElementById(id: string): HeadElementLike | null;
  createElement(tagName: string): HeadElementLike;
}

function upsertMetaTag(
  doc: HeadDocumentLike,
  attrName: 'name' | 'property',
  attrValue: string,
  content: string
): void {
  const selector = `meta[${attrName}="${attrValue}"]`;
  const existing = doc.querySelector(selector);
  if (existing) {
    existing.setAttribute('content', content);
    return;
  }
  const meta = doc.createElement('meta');
  meta.setAttribute(attrName, attrValue);
  meta.setAttribute('content', content);
  doc.head.appendChild(meta);
}

function removeMetaTagIfPresent(
  doc: HeadDocumentLike,
  attrName: 'name' | 'property',
  attrValue: string
): void {
  const existing = doc.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (existing) {
    existing.remove();
  }
}

function upsertLinkRel(doc: HeadDocumentLike, rel: string, href: string): void {
  const selector = `link[rel="${rel}"]`;
  const existing = doc.querySelector(selector);
  if (existing) {
    existing.setAttribute('href', href);
    return;
  }
  const link = doc.createElement('link');
  link.setAttribute('rel', rel);
  link.setAttribute('href', href);
  doc.head.appendChild(link);
}

export function applyResolvedSeoToDocument(
  doc: HeadDocumentLike,
  resolved: ResolvedDynamicPageSeo
): void {
  doc.title = resolved.title;

  upsertMetaTag(doc, 'name', 'description', resolved.description);
  upsertMetaTag(doc, 'name', 'robots', resolved.robots);

  if (resolved.keywords.trim()) {
    upsertMetaTag(doc, 'name', 'keywords', resolved.keywords.trim());
  } else {
    removeMetaTagIfPresent(doc, 'name', 'keywords');
  }

  upsertLinkRel(doc, 'canonical', resolved.canonicalUrl);

  // Open Graph metadata
  upsertMetaTag(doc, 'property', 'og:type', 'website');
  upsertMetaTag(doc, 'property', 'og:site_name', DEFAULT_SEO_SITE_NAME);
  upsertMetaTag(doc, 'property', 'og:url', resolved.canonicalUrl);
  upsertMetaTag(doc, 'property', 'og:title', resolved.ogTitle);
  upsertMetaTag(doc, 'property', 'og:description', resolved.ogDescription);
  upsertMetaTag(doc, 'property', 'og:image', resolved.ogImageUrl);

  // Twitter Card metadata
  upsertMetaTag(doc, 'name', 'twitter:card', resolved.twitterCard);
  upsertMetaTag(doc, 'name', 'twitter:site', resolved.twitterHandle || '@banglaaipro');
  upsertMetaTag(doc, 'name', 'twitter:title', resolved.twitterTitle);
  upsertMetaTag(doc, 'name', 'twitter:description', resolved.twitterDescription);
  upsertMetaTag(doc, 'name', 'twitter:image', resolved.ogImageUrl);

  // Route-level FAQPage JSON-LD structured data
  const existingFaqScript = doc.getElementById(FAQ_JSON_LD_SCRIPT_ID);
  if (resolved.faqJsonLd) {
    const serialized = JSON.stringify(resolved.faqJsonLd).replace(/</g, '\\u003c');
    if (existingFaqScript) {
      existingFaqScript.textContent = serialized;
    } else {
      const script = doc.createElement('script');
      script.id = FAQ_JSON_LD_SCRIPT_ID;
      script.setAttribute('id', FAQ_JSON_LD_SCRIPT_ID);
      script.setAttribute('type', 'application/ld+json');
      script.textContent = serialized;
      doc.head.appendChild(script);
    }
  } else if (existingFaqScript) {
    existingFaqScript.remove();
  }
}

function replaceOrInsertHeadTag(
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

export function injectDynamicPageSeoIntoHtml(
  html: string,
  resolved: ResolvedDynamicPageSeo
): string {
  const baseMeta = {
    ...resolveSeoMetadata(
      {
        seo_title: resolved.title,
        seo_description: resolved.description,
        seo_og_image_url: resolved.ogImageUrl,
      },
      resolved.canonicalUrl
    ),
    title: resolved.title,
    description: resolved.description,
    canonicalUrl: resolved.canonicalUrl,
    ogUrl: resolved.canonicalUrl,
    ogImageUrl: resolved.ogImageUrl,
  };

  let output = injectSeoMetaIntoHtml(html, baseMeta);

  output = replaceOrInsertHeadTag(
    output,
    /<meta\s+name=["']robots["'][^>]*>/i,
    `<meta name="robots" content="${escapeHtmlAttr(resolved.robots)}" />`
  );

  if (resolved.keywords.trim()) {
    output = replaceOrInsertHeadTag(
      output,
      /<meta\s+name=["']keywords["'][^>]*>/i,
      `<meta name="keywords" content="${escapeHtmlAttr(resolved.keywords.trim())}" />`
    );
  } else {
    output = output.replace(/\s*<meta\s+name=["']keywords["'][^>]*>\s*/gi, '\n');
  }

  output = replaceOrInsertHeadTag(
    output,
    /<meta\s+name=["']twitter:card["'][^>]*>/i,
    `<meta name="twitter:card" content="${escapeHtmlAttr(resolved.twitterCard)}" />`
  );
  output = replaceOrInsertHeadTag(
    output,
    /<meta\s+name=["']twitter:site["'][^>]*>/i,
    `<meta name="twitter:site" content="${escapeHtmlAttr(resolved.twitterHandle || '@banglaaipro')}" />`
  );
  output = replaceOrInsertHeadTag(
    output,
    /<meta\s+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtmlAttr(resolved.twitterTitle)}" />`
  );
  output = replaceOrInsertHeadTag(
    output,
    /<meta\s+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${escapeHtmlAttr(resolved.twitterDescription)}" />`
  );
  output = replaceOrInsertHeadTag(
    output,
    /<meta\s+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${escapeHtmlAttr(resolved.ogTitle)}" />`
  );
  output = replaceOrInsertHeadTag(
    output,
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${escapeHtmlAttr(resolved.ogDescription)}" />`
  );
  output = replaceOrInsertHeadTag(
    output,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtmlText(resolved.title)}</title>`
  );

  const faqPattern = new RegExp(
    `\\s*<script[^>]*id=["']${FAQ_JSON_LD_SCRIPT_ID}["'][^>]*>[\\s\\S]*?<\\/script>`,
    'i'
  );
  if (resolved.faqJsonLd) {
    const jsonText = JSON.stringify(resolved.faqJsonLd).replace(/</g, '\\u003c');
    const faqTag = `<script id="${FAQ_JSON_LD_SCRIPT_ID}" type="application/ld+json">${jsonText}</script>`;
    output = replaceOrInsertHeadTag(output, faqPattern, faqTag);
  } else {
    output = output.replace(faqPattern, '');
  }

  return output;
}
