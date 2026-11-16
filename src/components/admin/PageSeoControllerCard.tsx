import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Code2,
  Copy,
  Eye,
  EyeOff,
  FileSearch,
  Globe,
  Image as ImageIcon,
  Link2,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_OG_IMAGE_PATH,
  resolveBrowserPreviewImageUrl,
} from '../../utils/seo.ts';
import { copyTextSafely } from '../../utils/clipboard.ts';
import {
  DEFAULT_PAGE_SEO_PRESETS,
  RECOMMENDED_BANGLA_AI_FAQS,
  buildFaqPageJsonLd,
  checkFocusKeywordMatches,
  derivePageLabelFromSlug,
  evaluateSeoLength,
  isBuiltInSeoSlug,
  normalizePageSlug,
  resolveEffectiveCanonicalUrl,
  sanitizePageSeoInput,
  sortPageSeoConfigs,
  type FaqSchemaItem,
  type PageSeoConfig,
  type TwitterCardType,
} from '../../utils/seoController.ts';
import {
  deleteAdminPageSeoConfig,
  fetchAdminPageSeoConfigs,
  resetAdminPageSeoConfig,
  saveAdminPageSeoConfig,
} from '../../services/seoApi.ts';

interface PageSeoControllerCardProps {
  token?: string | null;
  setFeedback?: (msg: string | null) => void;
}

function buildInitialPageMap(): Record<string, PageSeoConfig> {
  const map: Record<string, PageSeoConfig> = {};
  for (const preset of DEFAULT_PAGE_SEO_PRESETS) {
    map[preset.slug] = {
      ...preset,
      faqItems: preset.faqItems.map((item) => ({ ...item })),
    };
  }
  return map;
}

function buildPageMapFromList(list: PageSeoConfig[]): Record<string, PageSeoConfig> {
  const map: Record<string, PageSeoConfig> = {};
  for (const item of sortPageSeoConfigs(list)) {
    map[item.slug] = {
      ...item,
      faqItems: Array.isArray(item.faqItems)
        ? item.faqItems.map((faq) => ({ ...faq }))
        : [],
    };
  }
  return map;
}

export const PageSeoControllerCard: React.FC<PageSeoControllerCardProps> = ({
  token,
  setFeedback,
}) => {
  const [pagesBySlug, setPagesBySlug] = useState<Record<string, PageSeoConfig>>(
    buildInitialPageMap
  );
  const [selectedSlug, setSelectedSlug] = useState<string>('/');
  const [newSlugInput, setNewSlugInput] = useState<string>('');
  const [showAddSlug, setShowAddSlug] = useState<boolean>(false);
  const [copiedJsonLd, setCopiedJsonLd] = useState<boolean>(false);
  const [ogPreviewError, setOgPreviewError] = useState<boolean>(false);
  const [lastSavedSlug, setLastSavedSlug] = useState<string | null>(null);
  const [loadingPages, setLoadingPages] = useState<boolean>(false);
  const [savingPage, setSavingPage] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoadingPages(true);
    fetchAdminPageSeoConfigs(token)
      .then((pages) => {
        if (cancelled || pages.length === 0) return;
        setPagesBySlug(buildPageMapFromList(pages));
        setActionError(null);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setActionError(err?.message || 'Could not load saved SEO configurations.');
      })
      .finally(() => {
        if (!cancelled) setLoadingPages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const pageList = useMemo(
    () => Object.values(pagesBySlug),
    [pagesBySlug]
  );

  const activeConfig: PageSeoConfig = pagesBySlug[selectedSlug] || pageList[0];

  const updateActiveConfig = (patch: Partial<PageSeoConfig>) => {
    setLastSavedSlug(null);
    setActionError(null);
    setPagesBySlug((prev) => {
      const current = prev[activeConfig.slug] || activeConfig;
      return {
        ...prev,
        [activeConfig.slug]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const titleEval = evaluateSeoLength(activeConfig.metaTitle, 30, 60);
  const descEval = evaluateSeoLength(activeConfig.metaDescription, 120, 160);
  const keywordMatches = checkFocusKeywordMatches(
    activeConfig.focusKeyword,
    activeConfig.metaTitle,
    activeConfig.metaDescription,
    activeConfig.slug
  );
  const effectiveCanonical = resolveEffectiveCanonicalUrl(
    activeConfig.slug,
    activeConfig.canonicalOverride
  );
  const robotsDirective = `${activeConfig.noIndex ? 'noindex' : 'index'}, ${
    activeConfig.noFollow ? 'nofollow' : 'follow'
  }`;

  const faqJsonLdObject = useMemo(() => {
    if (!activeConfig.faqSchemaEnabled) return null;
    return buildFaqPageJsonLd(activeConfig.faqItems, effectiveCanonical);
  }, [activeConfig.faqSchemaEnabled, activeConfig.faqItems, effectiveCanonical]);

  const faqJsonLdText = useMemo(() => {
    if (!faqJsonLdObject) return '';
    return JSON.stringify(faqJsonLdObject, null, 2);
  }, [faqJsonLdObject]);

  const ogImagePreviewSrc = resolveBrowserPreviewImageUrl(
    activeConfig.ogImageUrl || DEFAULT_OG_IMAGE_PATH
  );

  const handleAddCustomSlug = async () => {
    const trimmedInput = newSlugInput.trim();
    if (!trimmedInput) {
      setActionError('Please enter a route path such as "/pricing" or "/bangla-chatgpt".');
      return;
    }

    const normalized = normalizePageSlug(trimmedInput);
    if (pagesBySlug[normalized]) {
      setSelectedSlug(normalized);
      setShowAddSlug(false);
      setNewSlugInput('');
      setActionError(null);
      setFeedback?.(`Switched to existing route "${normalized}".`);
      return;
    }

    const derivedLabel = derivePageLabelFromSlug(normalized);
    const candidate: PageSeoConfig = {
      slug: normalized,
      pageLabel: derivedLabel,
      metaTitle: `${derivedLabel} — Bangla-AI.pro`,
      metaDescription: '',
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
    };

    const validated = sanitizePageSeoInput(candidate);
    if (!validated.ok) {
      setActionError(validated.error);
      return;
    }

    setActionError(null);
    if (!token) {
      setPagesBySlug((prev) => ({ ...prev, [normalized]: validated.config }));
      setSelectedSlug(normalized);
      setNewSlugInput('');
      setShowAddSlug(false);
      setOgPreviewError(false);
      setFeedback?.(`Added route "${normalized}" to the SEO Controller.`);
      return;
    }

    setSavingPage(true);
    try {
      const response = await saveAdminPageSeoConfig(token, validated.config);
      setPagesBySlug(buildPageMapFromList(response.pages));
      setSelectedSlug(response.config.slug);
      setNewSlugInput('');
      setShowAddSlug(false);
      setOgPreviewError(false);
      setLastSavedSlug(response.config.slug);
      setFeedback?.(`Created and saved SEO route "${response.config.slug}".`);
    } catch (err: any) {
      const message = err?.message || 'Failed to create custom SEO route.';
      setActionError(message);
      setFeedback?.(`Error: ${message}`);
    } finally {
      setSavingPage(false);
    }
  };

  const handleResetActivePage = async () => {
    setOgPreviewError(false);
    setActionError(null);

    if (token) {
      setSavingPage(true);
      try {
        const response = await resetAdminPageSeoConfig(token, activeConfig.slug);
        setPagesBySlug(buildPageMapFromList(response.pages));
        setLastSavedSlug(response.config.slug);
        setFeedback?.(`Reset SEO settings for "${response.config.slug}" in database.`);
      } catch (err: any) {
        const message = err?.message || 'Failed to reset page SEO configuration.';
        setActionError(message);
        setFeedback?.(`Error: ${message}`);
      } finally {
        setSavingPage(false);
      }
      return;
    }

    const defaultPreset = DEFAULT_PAGE_SEO_PRESETS.find(
      (preset) => preset.slug === activeConfig.slug
    );
    setLastSavedSlug(null);

    if (defaultPreset) {
      setPagesBySlug((prev) => ({
        ...prev,
        [activeConfig.slug]: {
          ...defaultPreset,
          faqItems: defaultPreset.faqItems.map((item) => ({ ...item })),
        },
      }));
      setFeedback?.(`Reset SEO fields for "${activeConfig.slug}" back to defaults.`);
      return;
    }

    updateActiveConfig({
      metaTitle: '',
      metaDescription: '',
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
    });
    setFeedback?.(`Cleared custom SEO fields for "${activeConfig.slug}".`);
  };

  const handleDeleteCustomPage = async () => {
    if (isBuiltInSeoSlug(activeConfig.slug)) return;
    setActionError(null);

    if (!token) {
      setPagesBySlug((prev) => {
        const next = { ...prev };
        delete next[activeConfig.slug];
        return next;
      });
      setSelectedSlug('/');
      setFeedback?.(`Removed custom route "${activeConfig.slug}".`);
      return;
    }

    setSavingPage(true);
    try {
      const response = await deleteAdminPageSeoConfig(token, activeConfig.slug);
      setPagesBySlug(buildPageMapFromList(response.pages));
      setSelectedSlug('/');
      setLastSavedSlug(null);
      setFeedback?.(`Deleted custom SEO route "${response.deletedSlug}".`);
    } catch (err: any) {
      const message = err?.message || 'Failed to delete custom SEO route.';
      setActionError(message);
      setFeedback?.(`Error: ${message}`);
    } finally {
      setSavingPage(false);
    }
  };

  const handleSavePageSeo = async () => {
    const validated = sanitizePageSeoInput(activeConfig);
    if (!validated.ok) {
      setActionError(validated.error);
      setFeedback?.(`Error: ${validated.error}`);
      return;
    }

    setActionError(null);
    if (!token) {
      updateActiveConfig({ updatedAt: validated.config.updatedAt });
      setLastSavedSlug(validated.config.slug);
      setFeedback?.(`Saved SEO settings for "${validated.config.slug}".`);
      return;
    }

    setSavingPage(true);
    try {
      const response = await saveAdminPageSeoConfig(token, validated.config);
      setPagesBySlug(buildPageMapFromList(response.pages));
      setLastSavedSlug(response.config.slug);
      setFeedback?.(`Saved SEO configuration for "${response.config.slug}" to PostgreSQL.`);
    } catch (err: any) {
      const message = err?.message || 'Failed to save page SEO configuration.';
      setActionError(message);
      setFeedback?.(`Error: ${message}`);
    } finally {
      setSavingPage(false);
    }
  };

  const handleAddFaqItem = () => {
    const nextItem: FaqSchemaItem = {
      id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      question: '',
      answer: '',
    };
    updateActiveConfig({
      faqSchemaEnabled: true,
      faqItems: [...activeConfig.faqItems, nextItem],
    });
  };

  const handleUpdateFaqItem = (
    id: string,
    field: 'question' | 'answer',
    value: string
  ) => {
    updateActiveConfig({
      faqItems: activeConfig.faqItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  const handleRemoveFaqItem = (id: string) => {
    updateActiveConfig({
      faqItems: activeConfig.faqItems.filter((item) => item.id !== id),
    });
  };

  const handleLoadRecommendedFaqs = () => {
    updateActiveConfig({
      faqSchemaEnabled: true,
      faqItems: RECOMMENDED_BANGLA_AI_FAQS.map((item, idx) => ({
        ...item,
        id: `faq-preset-${idx}-${Date.now()}`,
      })),
    });
    setFeedback?.('Loaded recommended Bangla AI FAQ schema entries.');
  };

  const handleCopyJsonLd = async () => {
    if (!faqJsonLdText) return;
    const copied = await copyTextSafely(faqJsonLdText);
    if (copied) {
      setCopiedJsonLd(true);
      setTimeout(() => setCopiedJsonLd(false), 2000);
      setFeedback?.('FAQPage JSON-LD schema copied to clipboard.');
    }
  };

  const statusTone = (status: 'empty' | 'short' | 'optimal' | 'long') => {
    switch (status) {
      case 'optimal':
        return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
      case 'long':
        return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800';
      case 'short':
        return 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
      default:
        return 'text-[#444746] dark:text-[#9aa0a6] bg-[#f0f4f9] dark:bg-[#131314] border-black/[0.08] dark:border-white/[0.08]';
    }
  };

  const statusLabel = (
    status: 'empty' | 'short' | 'optimal' | 'long',
    min: number,
    max: number
  ) => {
    if (status === 'optimal') return `Optimal (${min}–${max})`;
    if (status === 'long') return `Over ${max} chars`;
    if (status === 'short') return `Under ${min} chars`;
    return 'Empty';
  };

  const serpTitlePreview =
    activeConfig.metaTitle.trim() || `${activeConfig.pageLabel} — Bangla-AI.pro`;
  const serpDescPreview =
    activeConfig.metaDescription.trim() ||
    'Add a concise meta description (120–160 characters) to control your Google search snippet.';
  const serpBreadcrumb =
    activeConfig.slug === '/'
      ? 'https://bangla-ai.pro'
      : `https://bangla-ai.pro › ${activeConfig.slug.replace(/^\//, '').replace(/\//g, ' › ')}`;

  const descProgressPct = Math.min(100, Math.round((descEval.length / 160) * 100));

  return (
    <section
      aria-label="Dynamic Page SEO Controller"
      data-testid="page-seo-controller-card"
      className="bg-white dark:bg-[#1e1f20] p-5 sm:p-6 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] space-y-5 text-xs"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
            <FileSearch className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">
                Per-Page Technical SEO Controller
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {loadingPages ? 'Loading DB...' : 'DB Synced'}
              </span>
            </div>
            <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] mt-0.5 leading-relaxed">
              Configure route-specific Meta Titles, Descriptions, Focus Keywords, Open Graph &amp; Twitter Cards, Canonical URLs, Indexing directives, and FAQPage JSON-LD schema for <span className="font-mono">bangla-ai.pro</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isBuiltInSeoSlug(activeConfig.slug) && (
            <button
              type="button"
              disabled={savingPage}
              onClick={handleDeleteCustomPage}
              data-testid="page-seo-delete-btn"
              className="h-8 px-3 rounded-full border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 text-[11px] font-medium text-red-700 dark:text-red-400 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Route</span>
            </button>
          )}

          <button
            type="button"
            disabled={savingPage}
            onClick={handleResetActivePage}
            data-testid="page-seo-reset-btn"
            className="h-8 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[11px] font-medium text-[#444746] dark:text-[#c4c7c5] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Page</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          data-testid="page-seo-error-banner"
          className="px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-center gap-2 text-xs"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Route / Slug Target Selector */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
            Target Page Route
          </span>
          <button
            type="button"
            onClick={() => setShowAddSlug((prev) => !prev)}
            data-testid="page-seo-toggle-add-slug"
            className="h-7 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>{showAddSlug ? 'Cancel' : 'Add Custom Route'}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Target page routes">
          {pageList.map((page) => {
            const isSelected = page.slug === activeConfig.slug;
            return (
              <button
                key={page.slug}
                type="button"
                role="tab"
                aria-selected={isSelected}
                data-testid={`page-seo-slug-${page.slug === '/' ? 'home' : page.slug.replace(/^\//, '')}`}
                onClick={() => {
                  setSelectedSlug(page.slug);
                  setOgPreviewError(false);
                }}
                className={`h-8 px-3 rounded-full text-[11px] flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] border-transparent font-semibold'
                    : 'bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#c4c7c5] border-black/[0.08] dark:border-white/[0.08] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                }`}
              >
                <span className="font-mono">{page.slug}</span>
                {page.noIndex && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono uppercase ${
                      isSelected
                        ? 'bg-amber-400 text-[#131314]'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    noindex
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {showAddSlug && (
          <div className="p-3 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={newSlugInput}
              onChange={(e) => setNewSlugInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomSlug();
                }
              }}
              placeholder="/bangla-chatgpt or /pricing"
              aria-label="Custom page route slug"
              data-testid="page-seo-custom-slug-input"
              className="flex-1 px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
            />
            <button
              type="button"
              onClick={handleAddCustomSlug}
              data-testid="page-seo-custom-slug-create"
              className="h-8 px-4 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] font-semibold text-xs cursor-pointer shrink-0"
            >
              Create Route
            </button>
          </div>
        )}
      </div>

      {/* Main Split: Fields (Left) + Live Previews (Right on xl) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-7 space-y-4">
          {/* Dynamic Meta Title */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="page-seo-meta-title"
                className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
              >
                Meta Title
              </label>
              <div className="flex items-center gap-2">
                <span
                  data-testid="page-seo-title-status"
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusTone(
                    titleEval.status
                  )}`}
                >
                  {statusLabel(titleEval.status, 30, 60)}
                </span>
                <span
                  data-testid="page-seo-title-count"
                  className="text-[11px] font-mono tabular-nums text-[#444746] dark:text-[#9aa0a6]"
                >
                  {titleEval.length} / 60 chars
                </span>
              </div>
            </div>
            <input
              id="page-seo-meta-title"
              data-testid="page-seo-meta-title"
              type="text"
              value={activeConfig.metaTitle}
              onChange={(e) => updateActiveConfig({ metaTitle: e.target.value })}
              placeholder="e.g. Bangla AI — Bangladesh's All-in-One AI Platform"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
            />
          </div>

          {/* Meta Description */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="page-seo-meta-description"
                className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
              >
                Meta Description
              </label>
              <div className="flex items-center gap-2">
                <span
                  data-testid="page-seo-desc-status"
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusTone(
                    descEval.status
                  )}`}
                >
                  {statusLabel(descEval.status, 120, 160)}
                </span>
                <span
                  data-testid="page-seo-desc-count"
                  className="text-[11px] font-mono tabular-nums text-[#444746] dark:text-[#9aa0a6]"
                >
                  {descEval.length} / 160 chars
                </span>
              </div>
            </div>
            <textarea
              id="page-seo-meta-description"
              data-testid="page-seo-meta-description"
              rows={3}
              value={activeConfig.metaDescription}
              onChange={(e) => updateActiveConfig({ metaDescription: e.target.value })}
              placeholder="Write a compelling 120–160 character summary including your primary keyword..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs leading-relaxed focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] resize-y"
            />
            <div className="h-1 w-full rounded-full bg-[#f0f4f9] dark:bg-[#131314] overflow-hidden">
              <div
                className={`h-full transition-all ${
                  descEval.status === 'optimal'
                    ? 'bg-emerald-500'
                    : descEval.status === 'long'
                      ? 'bg-red-500'
                      : 'bg-amber-500'
                }`}
                style={{ width: `${descProgressPct}%` }}
              />
            </div>
          </div>

          {/* Focus Keyword + Factual Presence Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="page-seo-focus-keyword"
                className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
              >
                Focus Keyword
              </label>
              <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                Target query matching
              </span>
            </div>
            <input
              id="page-seo-focus-keyword"
              data-testid="page-seo-focus-keyword"
              type="text"
              value={activeConfig.focusKeyword}
              onChange={(e) => updateActiveConfig({ focusKeyword: e.target.value })}
              placeholder="e.g. bangla ai"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
            />

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                { label: 'In Title', matched: keywordMatches.inTitle },
                { label: 'In Description', matched: keywordMatches.inDescription },
                { label: 'In URL Slug', matched: keywordMatches.inSlug },
              ].map((check) => (
                <span
                  key={check.label}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium border flex items-center gap-1 ${
                    !keywordMatches.hasKeyword
                      ? 'bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6] border-black/[0.08] dark:border-white/[0.08]'
                      : check.matched
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6] border-black/[0.08] dark:border-white/[0.08]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      keywordMatches.hasKeyword && check.matched
                        ? 'bg-emerald-500'
                        : 'bg-[#9aa0a6]'
                    }`}
                  />
                  <span>
                    {check.label}: {keywordMatches.hasKeyword ? (check.matched ? 'Yes' : 'Missing') : 'N/A'}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Open Graph Image & Twitter Card Settings */}
          <div className="p-4 rounded-xl bg-[#f0f4f9]/70 dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3]">
                Open Graph Image &amp; Twitter Card
              </span>
              <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                1200×630 recommended
              </span>
            </div>

            <div>
              <label
                htmlFor="page-seo-og-image"
                className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]"
              >
                OG &amp; Twitter Image URL
              </label>
              <input
                id="page-seo-og-image"
                data-testid="page-seo-og-image"
                type="text"
                value={activeConfig.ogImageUrl}
                onChange={(e) => {
                  setOgPreviewError(false);
                  updateActiveConfig({ ogImageUrl: e.target.value });
                }}
                placeholder="/og-banner.png or https://bangla-ai.pro/og-banner.png"
                className="w-full px-3.5 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="page-seo-twitter-card"
                  className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]"
                >
                  Twitter Card Format
                </label>
                <select
                  id="page-seo-twitter-card"
                  data-testid="page-seo-twitter-card"
                  value={activeConfig.twitterCard}
                  onChange={(e) =>
                    updateActiveConfig({
                      twitterCard: e.target.value as TwitterCardType,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                >
                  <option value="summary_large_image">Summary Large Image</option>
                  <option value="summary">Compact Summary Card</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="page-seo-twitter-handle"
                  className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]"
                >
                  Twitter / X @site Handle
                </label>
                <input
                  id="page-seo-twitter-handle"
                  data-testid="page-seo-twitter-handle"
                  type="text"
                  value={activeConfig.twitterHandle}
                  onChange={(e) =>
                    updateActiveConfig({ twitterHandle: e.target.value })
                  }
                  placeholder="@banglaaipro"
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="page-seo-twitter-title"
                  className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]"
                >
                  Twitter Title Override (Optional)
                </label>
                <input
                  id="page-seo-twitter-title"
                  type="text"
                  value={activeConfig.twitterTitle}
                  onChange={(e) =>
                    updateActiveConfig({ twitterTitle: e.target.value })
                  }
                  placeholder="Defaults to Meta Title"
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                />
              </div>

              <div>
                <label
                  htmlFor="page-seo-twitter-description"
                  className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]"
                >
                  Twitter Description Override (Optional)
                </label>
                <input
                  id="page-seo-twitter-description"
                  type="text"
                  value={activeConfig.twitterDescription}
                  onChange={(e) =>
                    updateActiveConfig({ twitterDescription: e.target.value })
                  }
                  placeholder="Defaults to Meta Description"
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                />
              </div>
            </div>
          </div>

          {/* Canonical URL Override & Index / No-Index Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-[#f0f4f9]/70 dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
              <label
                htmlFor="page-seo-canonical"
                className="flex items-center gap-1.5 font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
              >
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                <span>Canonical URL Override</span>
              </label>
              <input
                id="page-seo-canonical"
                data-testid="page-seo-canonical"
                type="url"
                value={activeConfig.canonicalOverride}
                onChange={(e) =>
                  updateActiveConfig({ canonicalOverride: e.target.value })
                }
                placeholder={`Auto: ${resolveEffectiveCanonicalUrl(activeConfig.slug)}`}
                className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-[11px] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
              />
              <div className="text-[10px] text-[#444746] dark:text-[#9aa0a6] break-all">
                Effective: <span className="font-mono text-[#1f1f1f] dark:text-[#e3e3e3]">{effectiveCanonical}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f0f4f9]/70 dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5">
                    {activeConfig.noIndex ? (
                      <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    <span>Search Engine Indexing</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6] mt-0.5">
                    robots: <span data-testid="page-seo-robots-directive">{robotsDirective}</span>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={!activeConfig.noIndex}
                  aria-label="Allow search engines to index this page"
                  data-testid="page-seo-noindex-toggle"
                  onClick={() => updateActiveConfig({ noIndex: !activeConfig.noIndex })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors ${
                    !activeConfig.noIndex
                      ? 'bg-emerald-600 border-emerald-600'
                      : 'bg-amber-600/85 border-amber-600/85'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                      !activeConfig.noIndex ? 'translate-x-5.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                  {activeConfig.noIndex
                    ? 'No-Index enabled (hidden from Google)'
                    : 'Indexable (eligible for Google SERP)'}
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0 text-[11px] text-[#1f1f1f] dark:text-[#e3e3e3]">
                  <input
                    type="checkbox"
                    checked={activeConfig.noFollow}
                    onChange={(e) => updateActiveConfig({ noFollow: e.target.checked })}
                    className="rounded w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="font-mono">nofollow</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Google SERP + Social Card Thumbnail Preview */}
        <div className="xl:col-span-5 space-y-4">
          <div
            data-testid="page-seo-serp-preview"
            className="p-4 rounded-xl bg-[#f0f4f9]/70 dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3]">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>Google SERP Snippet Preview</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase border ${
                  activeConfig.noIndex
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                }`}
              >
                {activeConfig.noIndex ? 'NOINDEX' : 'INDEX'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#1e1f20] border border-black/[0.06] dark:border-white/[0.06] space-y-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                  <Globe className="w-3 h-3 text-[#444746] dark:text-[#c4c7c5]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#202124] dark:text-[#dadce0] truncate">
                    Bangla-AI.pro
                  </div>
                  <div className="text-[10px] font-mono text-[#4d5156] dark:text-[#9aa0a6] truncate">
                    {serpBreadcrumb}
                  </div>
                </div>
              </div>

              <div className="text-[15px] font-medium text-[#1a0dab] dark:text-[#8ab4f8] leading-snug line-clamp-2 pt-0.5">
                {serpTitlePreview}
              </div>

              <p className="text-[12px] text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed line-clamp-3">
                {serpDescPreview}
              </p>

              {faqJsonLdObject && (
                <div className="pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06] space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
                    Rich Result · FAQPage ({activeConfig.faqItems.filter((i) => i.question.trim() && i.answer.trim()).length})
                  </div>
                  {activeConfig.faqItems
                    .filter((item) => item.question.trim() && item.answer.trim())
                    .slice(0, 2)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="text-[11px] text-[#202124] dark:text-[#dadce0] truncate"
                      >
                        ▸ {item.question}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Compact OG / Twitter Card Visual Thumbnail Preview */}
          <div className="p-4 rounded-xl bg-[#f0f4f9]/70 dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3]">
                Twitter / OG Card Preview
              </span>
              <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                {activeConfig.twitterCard}
              </span>
            </div>

            <div className="rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20]">
              <div
                className={`bg-[#131314] overflow-hidden flex items-center justify-center ${
                  activeConfig.twitterCard === 'summary' ? 'h-24' : 'aspect-[1200/630]'
                }`}
              >
                {ogPreviewError ? (
                  <div className="flex flex-col items-center gap-1 text-[#9aa0a6] p-3 text-center">
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-[10px]">Image preview unavailable</span>
                  </div>
                ) : (
                  <img
                    src={ogImagePreviewSrc}
                    alt="Route Open Graph Preview"
                    referrerPolicy="no-referrer"
                    onError={() => setOgPreviewError(true)}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-3 space-y-0.5">
                <div className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6] truncate">
                  {activeConfig.twitterHandle || '@banglaaipro'} · bangla-ai.pro
                </div>
                <div className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] line-clamp-1">
                  {activeConfig.twitterTitle.trim() || serpTitlePreview}
                </div>
                <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6] line-clamp-2">
                  {activeConfig.twitterDescription.trim() || serpDescPreview}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schema Markup Generator: FAQPage JSON-LD */}
      <div className="p-4 rounded-xl bg-[#f0f4f9]/70 dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-start gap-2 min-w-0">
            <Code2 className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3]">
                Schema Markup Generator · FAQPage JSON-LD
              </div>
              <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] mt-0.5">
                Build valid <span className="font-mono">schema.org/FAQPage</span> structured data to win Google FAQ rich results.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadRecommendedFaqs}
              className="h-7 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#1e1f20] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[11px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>Load Bangla AI FAQs</span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={activeConfig.faqSchemaEnabled}
              aria-label="Enable FAQPage JSON-LD schema for this route"
              data-testid="page-seo-faq-toggle"
              onClick={() =>
                updateActiveConfig({
                  faqSchemaEnabled: !activeConfig.faqSchemaEnabled,
                })
              }
              className={`h-7 px-3 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                activeConfig.faqSchemaEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-white dark:bg-[#1e1f20] text-[#444746] dark:text-[#9aa0a6] border-black/[0.1] dark:border-white/[0.12]'
              }`}
            >
              {activeConfig.faqSchemaEnabled ? 'Schema Enabled' : 'Schema Disabled'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Q&A Repeater */}
          <div className="lg:col-span-7 space-y-2.5">
            {activeConfig.faqItems.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-black/[0.12] dark:border-white/[0.12] text-center space-y-2">
                <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                  No FAQ entries configured for <span className="font-mono">{activeConfig.slug}</span> yet.
                </p>
                <button
                  type="button"
                  onClick={handleAddFaqItem}
                  data-testid="page-seo-add-faq-btn"
                  className="h-8 px-4 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add FAQ Item</span>
                </button>
              </div>
            ) : (
              <>
                {activeConfig.faqItems.map((item, idx) => (
                  <div
                    key={item.id}
                    data-testid={`page-seo-faq-item-${idx}`}
                    className="p-3 rounded-xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
                        Question #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFaqItem(item.id)}
                        aria-label={`Remove FAQ item ${idx + 1}`}
                        className="p-1 rounded text-[#444746] dark:text-[#9aa0a6] hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) =>
                        handleUpdateFaqItem(item.id, 'question', e.target.value)
                      }
                      placeholder="Question (e.g. How much does Bangla AI cost per month?)"
                      className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                    />
                    <textarea
                      rows={2}
                      value={item.answer}
                      onChange={(e) =>
                        handleUpdateFaqItem(item.id, 'answer', e.target.value)
                      }
                      placeholder="Concise, direct answer for Google FAQ rich snippets..."
                      className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs leading-relaxed focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] resize-y"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddFaqItem}
                  data-testid="page-seo-add-faq-btn"
                  className="h-8 px-3.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#1e1f20] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Question</span>
                </button>
              </>
            )}
          </div>

          {/* Generated JSON-LD Code Preview */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
                Generated JSON-LD Output
              </span>
              <button
                type="button"
                disabled={!faqJsonLdText}
                onClick={handleCopyJsonLd}
                data-testid="page-seo-copy-jsonld-btn"
                className="h-7 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#1e1f20] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[11px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
              >
                {copiedJsonLd ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy JSON-LD</span>
                  </>
                )}
              </button>
            </div>

            <pre
              data-testid="page-seo-jsonld-preview"
              className="p-3 rounded-xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] font-mono text-[10px] leading-relaxed text-[#1f1f1f] dark:text-[#e3e3e3] max-h-64 overflow-auto whitespace-pre-wrap break-words"
            >
              {faqJsonLdText ||
                '// Enable FAQ Schema and add at least one Question + Answer to generate FAQPage JSON-LD.'}
            </pre>
          </div>
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6]" data-testid="page-seo-save-status">
          {lastSavedSlug === activeConfig.slug ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              Saved SEO configuration for <span className="font-mono">{activeConfig.slug}</span> to database.
            </span>
          ) : activeConfig.updatedAt ? (
            <span>
              Editing <span className="font-mono text-[#1f1f1f] dark:text-[#e3e3e3]">{activeConfig.slug}</span> · Last saved{' '}
              <span className="font-mono">
                {new Date(activeConfig.updatedAt).toLocaleString()}
              </span>
            </span>
          ) : (
            <span>
              Editing route <span className="font-mono text-[#1f1f1f] dark:text-[#e3e3e3]">{activeConfig.slug}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={savingPage || loadingPages}
          onClick={handleSavePageSeo}
          data-testid="page-seo-save-draft-btn"
          className="h-9 px-5 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
        >
          {savingPage ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{savingPage ? 'Saving...' : 'Save Page SEO'}</span>
        </button>
      </div>
    </section>
  );
};
