import React, { useEffect } from 'react';
import { MonitorDown, PlusSquare, Share, X } from 'lucide-react';
import { useAppInstall } from '../../context/AppInstallContext.tsx';
import { BrandLogo } from './BrandLogo.tsx';

export const InstallGuideModal: React.FC = () => {
  const { guideMode, closeGuide } = useAppInstall();

  useEffect(() => {
    if (!guideMode) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGuide();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [guideMode, closeGuide]);

  if (!guideMode) return null;

  const isIOS = guideMode === 'ios';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-guide-title"
      data-testid="pwa-install-guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] animate-in fade-in"
        onClick={closeGuide}
        aria-hidden="true"
      />

      {/* Sleek Google-Style Rounded Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <h3
                id="install-guide-title"
                className="text-base font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]"
              >
                {isIOS ? 'Install Bangla AI on iOS' : 'Install Bangla AI App'}
              </h3>
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6]">
                {isIOS
                  ? 'Add to your iPhone or iPad Home Screen'
                  : 'Run Bangla AI in its own standalone window'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeGuide}
            aria-label="Close install guide"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <ol className="space-y-3 text-xs text-[#1f1f1f] dark:text-[#e3e3e3]">
            <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06]">
              <span className="w-6 h-6 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] text-[11px] font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <div className="leading-relaxed">
                Tap the{' '}
                <span className="inline-flex items-center gap-1 font-semibold">
                  Share icon
                  <Share className="w-3.5 h-3.5 inline-block" aria-hidden="true" />
                </span>{' '}
                at the bottom or top bar of Safari.
              </div>
            </li>

            <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06]">
              <span className="w-6 h-6 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] text-[11px] font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <div className="leading-relaxed">
                Scroll down and tap{' '}
                <span className="inline-flex items-center gap-1 font-semibold">
                  &ldquo;Add to Home Screen&rdquo;
                  <PlusSquare className="w-3.5 h-3.5 inline-block" aria-hidden="true" />
                </span>
                .
              </div>
            </li>
          </ol>
        ) : (
          <div className="p-4 rounded-2xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] space-y-2.5 text-xs text-[#444746] dark:text-[#c4c7c5] leading-relaxed">
            <div className="flex items-center gap-2 font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
              <MonitorDown className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Quick Browser Installation</span>
            </div>
            <p>
              Click the <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Install</strong> icon in your browser&apos;s address bar, or open your browser menu (&#8942;) and choose{' '}
              <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Install Bangla AI</strong> /{' '}
              <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Add to Home Screen</strong>.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={closeGuide}
          data-testid="pwa-install-guide-close"
          className="btn-pill-primary w-full h-10 text-xs font-semibold justify-center cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
