import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  FileCode2,
  RefreshCw,
  Save,
  SearchCheck,
  ShieldCheck,
} from 'lucide-react';
import {
  buildRobotsTxt,
  validateGa4MeasurementId,
  validateGscVerificationCode,
} from '../../utils/technicalSeo.ts';

interface TechnicalSeoCardProps {
  globalSettings: any;
  setGlobalSettings: React.Dispatch<React.SetStateAction<any>>;
  savingSettings: boolean;
  onSaveTechnicalSeo: (e: React.FormEvent) => void;
}

export const TechnicalSeoCard: React.FC<TechnicalSeoCardProps> = ({
  globalSettings,
  setGlobalSettings,
  savingSettings,
  onSaveTechnicalSeo,
}) => {
  const [sitemapXml, setSitemapXml] = useState<string>('');
  const [loadingSitemap, setLoadingSitemap] = useState(false);
  const [showXmlPreview, setShowXmlPreview] = useState(false);

  const rawGsc = String(globalSettings.gsc_verification_code || '');
  const gscValidation = useMemo(() => validateGscVerificationCode(rawGsc), [rawGsc]);

  const rawGa4 = String(globalSettings.ga4_measurement_id || '');
  const ga4Validation = useMemo(() => validateGa4MeasurementId(rawGa4), [rawGa4]);

  const liveRobotsPreview = useMemo(
    () =>
      buildRobotsTxt({
        origin: 'https://bangla-ai.pro',
        extraRules: String(globalSettings.robots_txt_extra || ''),
      }),
    [globalSettings.robots_txt_extra]
  );

  const sitemapUrlCount = useMemo(() => {
    if (!sitemapXml) return 0;
    const matches = sitemapXml.match(/<url>/g);
    return matches ? matches.length : 0;
  }, [sitemapXml]);

  const loadLiveSitemap = async () => {
    setLoadingSitemap(true);
    try {
      const res = await fetch(`/sitemap.xml?ts=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const xmlText = await res.text();
        setSitemapXml(xmlText);
      }
    } catch {
      // Ignore transient network errors inside previewer
    } finally {
      setLoadingSitemap(false);
    }
  };

  useEffect(() => {
    void loadLiveSitemap();
  }, []);

  return (
    <form
      onSubmit={onSaveTechnicalSeo}
      data-testid="technical-seo-engine-card"
      className="bg-white dark:bg-[#1e1f20] p-5 sm:p-6 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] space-y-5 text-xs"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <FileCode2 className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] mt-0.5 shrink-0" />
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">
              Technical SEO Engine (Sitemap, Robots.txt, GSC &amp; GA4)
            </h4>
            <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] mt-0.5 leading-relaxed">
              Automatically maintains <span className="font-mono">/sitemap.xml</span> across pages and active AI models, serves a customized <span className="font-mono">/robots.txt</span>, and injects verified Search Console &amp; GA4 tags into SSR and SPA <span className="font-mono">&lt;head&gt;</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[11px] font-mono text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1 transition-colors"
          >
            <span>sitemap.xml</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[11px] font-mono text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1 transition-colors"
          >
            <span>robots.txt</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Section 1: Google Search Console + GA4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Google Search Console Verification */}
        <div className="p-4 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="gsc-verification-input"
              className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5"
            >
              <SearchCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Google Search Console Verification</span>
            </label>
            {gscValidation.valid && gscValidation.code ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            ) : null}
          </div>

          <input
            id="gsc-verification-input"
            type="text"
            value={rawGsc}
            onChange={(e) =>
              setGlobalSettings({ ...globalSettings, gsc_verification_code: e.target.value })
            }
            placeholder='Paste token or full <meta name="google-site-verification" content="..." />'
            className="w-full px-3.5 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-[11px] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
          />

          {!gscValidation.valid ? (
            <p className="text-[11px] text-red-600 dark:text-red-400">{gscValidation.error}</p>
          ) : gscValidation.code ? (
            <div className="p-2 rounded-lg bg-white/80 dark:bg-[#1e1f20] border border-black/[0.06] dark:border-white/[0.06] font-mono text-[10px] text-[#444746] dark:text-[#c4c7c5] break-all">
              {`<meta name="google-site-verification" content="${gscValidation.code}" />`}
            </div>
          ) : (
            <p className="text-[10px] text-[#444746] dark:text-[#9aa0a6]">
              Injected directly in server SSR HTML so Google Search Console verifies ownership immediately.
            </p>
          )}
        </div>

        {/* Google Analytics 4 (GA4) */}
        <div className="p-4 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="ga4-measurement-id-input"
              className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Google Analytics 4 (GA4)</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                data-testid="ga4-enabled-toggle"
                checked={Boolean(globalSettings.ga4_enabled)}
                onChange={(e) =>
                  setGlobalSettings({ ...globalSettings, ga4_enabled: e.target.checked })
                }
                className="rounded w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                Enable GA4
              </span>
            </label>
          </div>

          <input
            id="ga4-measurement-id-input"
            type="text"
            value={rawGa4}
            onChange={(e) =>
              setGlobalSettings({ ...globalSettings, ga4_measurement_id: e.target.value })
            }
            placeholder="e.g. G-1A2B3C4D5E"
            className="w-full px-3.5 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-[11px] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
          />

          {!ga4Validation.valid ? (
            <p className="text-[11px] text-red-600 dark:text-red-400">{ga4Validation.error}</p>
          ) : globalSettings.ga4_enabled && ga4Validation.measurementId ? (
            <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
              Active gtag.js &amp; SPA route page_view tracking for {ga4Validation.measurementId}
            </p>
          ) : (
            <p className="text-[10px] text-[#444746] dark:text-[#9aa0a6]">
              Tracks organic search visitors and SPA page transitions using privacy-safe IP anonymization.
            </p>
          )}
        </div>
      </div>

      {/* Section 2: Customized robots.txt & Dynamic sitemap.xml Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Robots.txt Customizer */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="robots-txt-extra-input"
              className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#1f1f1f] dark:text-[#e3e3e3]" />
              <span>Custom Robots.txt Directives (Optional)</span>
            </label>
            <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6]">
              Appended below core rules
            </span>
          </div>

          <textarea
            id="robots-txt-extra-input"
            rows={4}
            value={String(globalSettings.robots_txt_extra || '')}
            onChange={(e) =>
              setGlobalSettings({ ...globalSettings, robots_txt_extra: e.target.value })
            }
            placeholder={'# Optional extra crawler rules\nUser-agent: GPTBot\nAllow: /\nCrawl-delay: 2'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-[11px] leading-relaxed focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] resize-y"
          />

          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
              Live Generated /robots.txt Preview
            </span>
            <pre
              data-testid="robots-txt-preview"
              className="p-3 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] font-mono text-[10px] text-[#1f1f1f] dark:text-[#c4c7c5] overflow-x-auto whitespace-pre-wrap leading-relaxed"
            >
              {liveRobotsPreview}
            </pre>
          </div>
        </div>

        {/* Dynamic Sitemap Inspector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
              Dynamic Sitemap Feed (<span className="font-mono">{sitemapUrlCount}</span> URLs indexed)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={loadLiveSitemap}
                disabled={loadingSitemap}
                className="h-7 px-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[10px] font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loadingSitemap ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setShowXmlPreview((v) => !v)}
                className="h-7 px-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[10px] font-medium cursor-pointer"
              >
                {showXmlPreview ? 'Hide XML' : 'Inspect XML'}
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
            <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] leading-relaxed">
              Automatically regenerates whenever you publish new SEO routes in the Page SEO Controller or enable new foundation models in the Models Catalog. Pages marked <span className="font-mono">noindex</span> and private routes (<span className="font-mono">/workspace</span>, <span className="font-mono">/account</span>, <span className="font-mono">/admin</span>) are automatically excluded.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded-full bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] text-[#1f1f1f] dark:text-[#e3e3e3]">
                Endpoint: /sitemap.xml
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                {sitemapUrlCount > 0 ? `${sitemapUrlCount} Live URLs` : 'Auto-Updating'}
              </span>
            </div>
          </div>

          {showXmlPreview && (
            <pre
              data-testid="sitemap-xml-preview"
              className="max-h-56 p-3 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] font-mono text-[10px] text-[#1f1f1f] dark:text-[#c4c7c5] overflow-auto whitespace-pre leading-relaxed"
            >
              {sitemapXml || 'Loading /sitemap.xml...'}
            </pre>
          )}
        </div>
      </div>

      {/* Footer Save Action */}
      <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex justify-end">
        <button
          type="submit"
          disabled={savingSettings}
          data-testid="save-technical-seo-btn"
          className="h-9 px-5 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{savingSettings ? 'Saving...' : 'Save Technical SEO'}</span>
        </button>
      </div>
    </form>
  );
};
