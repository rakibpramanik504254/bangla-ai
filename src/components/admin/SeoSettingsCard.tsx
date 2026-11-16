import React, { useRef, useState } from 'react';
import { Globe, Upload, RotateCcw, Image as ImageIcon } from 'lucide-react';
import {
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  resolveBrowserPreviewImageUrl
} from '../../utils/seo.ts';

interface SeoSettingsCardProps {
  token: string | null;
  globalSettings: any;
  setGlobalSettings: React.Dispatch<React.SetStateAction<any>>;
  setFeedback: (msg: string | null) => void;
}

export const SeoSettingsCard: React.FC<SeoSettingsCardProps> = ({
  token,
  globalSettings,
  setGlobalSettings,
  setFeedback
}) => {
  const [previewPlatform, setPreviewPlatform] = useState<'facebook' | 'whatsapp'>('facebook');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeTitle =
    (typeof globalSettings.seo_title === 'string' && globalSettings.seo_title.trim()) ||
    DEFAULT_SEO_TITLE;
  const activeDescription =
    (typeof globalSettings.seo_description === 'string' && globalSettings.seo_description.trim()) ||
    DEFAULT_SEO_DESCRIPTION;
  const rawBannerInput =
    typeof globalSettings.seo_og_image_url === 'string'
      ? globalSettings.seo_og_image_url
      : DEFAULT_OG_IMAGE_PATH;
  const previewImageSrc = resolveBrowserPreviewImageUrl(rawBannerInput);

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (file.size > 4 * 1024 * 1024) {
      setFeedback('Error: OG banner image must be smaller than 4 MB.');
      e.target.value = '';
      return;
    }

    setUploadingBanner(true);
    setImageLoadError(false);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/admin/seo/upload-banner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ dataUrl })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Error: ${data.error || 'Failed to upload OG banner image.'}`);
        return;
      }

      setGlobalSettings((prev: any) => ({
        ...prev,
        seo_og_image_url: data.seo_og_image_url,
        has_custom_uploaded_og_banner: true
      }));
      setFeedback('Custom OG Banner saved to PostgreSQL. Social preview updated!');
    } catch (err: any) {
      setFeedback(`Error: ${err.message || 'Failed to upload OG banner image.'}`);
    } finally {
      setUploadingBanner(false);
      e.target.value = '';
    }
  };

  const handleResetSeoDefaults = () => {
    setImageLoadError(false);
    setGlobalSettings((prev: any) => ({
      ...prev,
      seo_title: DEFAULT_SEO_TITLE,
      seo_description: DEFAULT_SEO_DESCRIPTION,
      seo_og_image_url: DEFAULT_OG_IMAGE_PATH,
      has_custom_uploaded_og_banner: false
    }));
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0" />
          <h4 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">
            SEO &amp; Social Share Preview
          </h4>
        </div>
        <button
          type="button"
          onClick={handleResetSeoDefaults}
          className="h-7 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[11px] font-medium text-[#444746] dark:text-[#c4c7c5] flex items-center gap-1 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
        Customize how <span className="font-mono">bangla-ai.pro</span> appears on Google Search, Facebook, Messenger, WhatsApp, LinkedIn &amp; X. Injected directly in server HTML for instant social crawler previews and persisted in PostgreSQL.
      </p>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label
            htmlFor="seo-site-title"
            className="block font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
          >
            SEO Site Title:
          </label>
          <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">
            {String(globalSettings.seo_title ?? DEFAULT_SEO_TITLE).length} chars
          </span>
        </div>
        <input
          id="seo-site-title"
          type="text"
          value={globalSettings.seo_title ?? DEFAULT_SEO_TITLE}
          onChange={e =>
            setGlobalSettings({ ...globalSettings, seo_title: e.target.value })
          }
          placeholder={DEFAULT_SEO_TITLE}
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label
            htmlFor="seo-meta-description"
            className="block font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
          >
            Meta Description:
          </label>
          <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">
            {String(globalSettings.seo_description ?? DEFAULT_SEO_DESCRIPTION).length} chars
          </span>
        </div>
        <textarea
          id="seo-meta-description"
          rows={2}
          value={globalSettings.seo_description ?? DEFAULT_SEO_DESCRIPTION}
          onChange={e =>
            setGlobalSettings({ ...globalSettings, seo_description: e.target.value })
          }
          placeholder={DEFAULT_SEO_DESCRIPTION}
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs leading-relaxed focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] resize-y"
        />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <label
            htmlFor="seo-og-image-url"
            className="block font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
          >
            Custom OG Banner Image URL (1200×630):
          </label>
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleBannerFileUpload}
              className="hidden"
              aria-label="Upload custom OG banner image"
            />
            <button
              type="button"
              disabled={uploadingBanner}
              onClick={() => fileInputRef.current?.click()}
              className="h-7 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Upload className="w-3 h-3" />
              <span>{uploadingBanner ? 'Uploading...' : 'Upload Image'}</span>
            </button>
          </div>
        </div>
        <input
          id="seo-og-image-url"
          type="text"
          value={rawBannerInput}
          onChange={e => {
            setImageLoadError(false);
            setGlobalSettings({ ...globalSettings, seo_og_image_url: e.target.value });
          }}
          placeholder="/og-banner.png or https://..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
        />
        <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block mt-1">
          Defaults to <span className="font-mono">/og-banner.png</span>. Paste a full <span className="font-mono">https://</span> URL or upload a PNG/JPG (stored in PostgreSQL).
        </span>
      </div>

      {/* Live Social Share Card Preview */}
      <div className="pt-2 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
            Social Share Card Preview
          </span>
          <div className="inline-flex rounded-full p-0.5 bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setPreviewPlatform('facebook')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition-colors ${
                previewPlatform === 'facebook'
                  ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3]'
                  : 'text-[#444746] dark:text-[#9aa0a6]'
              }`}
            >
              Facebook / LinkedIn
            </button>
            <button
              type="button"
              onClick={() => setPreviewPlatform('whatsapp')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition-colors ${
                previewPlatform === 'whatsapp'
                  ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3]'
                  : 'text-[#444746] dark:text-[#9aa0a6]'
              }`}
            >
              WhatsApp
            </button>
          </div>
        </div>

        {previewPlatform === 'facebook' ? (
          <div
            data-testid="seo-share-preview-facebook"
            className="rounded-xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#1e1f20] shadow-xs"
          >
            <div className="w-full aspect-[1200/630] bg-[#131314] flex items-center justify-center overflow-hidden border-b border-black/[0.06] dark:border-white/[0.08]">
              {imageLoadError ? (
                <div className="flex flex-col items-center gap-1.5 text-[#9aa0a6] p-4 text-center">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-[11px]">Preview image failed to load</span>
                </div>
              ) : (
                <img
                  src={previewImageSrc}
                  alt="Social Share Card OG Banner Preview"
                  referrerPolicy="no-referrer"
                  onError={() => setImageLoadError(true)}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-3 bg-[#f2f3f5] dark:bg-[#282a2c] space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wide text-[#606770] dark:text-[#9aa0a6]">
                BANGLA-AI.PRO
              </div>
              <div className="text-[13px] font-bold text-[#1d2129] dark:text-[#e3e3e3] leading-snug line-clamp-2">
                {activeTitle}
              </div>
              <div className="text-[11px] text-[#606770] dark:text-[#c4c7c5] leading-relaxed line-clamp-2">
                {activeDescription}
              </div>
            </div>
          </div>
        ) : (
          <div
            data-testid="seo-share-preview-whatsapp"
            className="rounded-xl p-2.5 bg-[#e7ffdb] dark:bg-[#054640] border border-emerald-200 dark:border-emerald-900/60 space-y-2 max-w-md"
          >
            <div className="rounded-lg overflow-hidden bg-black/5 dark:bg-black/25 border border-black/[0.06] dark:border-white/[0.08]">
              <div className="w-full aspect-[1200/630] bg-[#131314] overflow-hidden flex items-center justify-center">
                {imageLoadError ? (
                  <div className="flex flex-col items-center gap-1 text-[#9aa0a6] p-3 text-center">
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-[10px]">Image unavailable</span>
                  </div>
                ) : (
                  <img
                    src={previewImageSrc}
                    alt="WhatsApp Link Preview Banner"
                    referrerPolicy="no-referrer"
                    onError={() => setImageLoadError(true)}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-2.5 space-y-0.5">
                <div className="text-[12px] font-semibold text-[#111b21] dark:text-[#e9edef] leading-snug line-clamp-2">
                  {activeTitle}
                </div>
                <div className="text-[11px] text-[#54656f] dark:text-[#b1c5c2] leading-snug line-clamp-2">
                  {activeDescription}
                </div>
                <div className="text-[10px] font-mono text-[#667781] dark:text-[#8696a0] pt-0.5">
                  bangla-ai.pro
                </div>
              </div>
            </div>
            <div className="text-[12px] text-[#027eb5] dark:text-[#53bdeb] underline px-1">
              https://bangla-ai.pro
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
