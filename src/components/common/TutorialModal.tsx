import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { TUTORIAL_EMBED_URL } from '../../utils/tutorial.ts';
import { BrandLogo } from './BrandLogo.tsx';

export const TutorialModal: React.FC = () => {
  const { isTutorialModalOpen, closeTutorialModal } = useAuth();
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isTutorialModalOpen) return;
    closeButtonRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeTutorialModal();
      }
    };
    window.addEventListener('keydown', handleEsc, true);
    document.addEventListener('keydown', handleEsc, true);
    return () => {
      window.removeEventListener('keydown', handleEsc, true);
      document.removeEventListener('keydown', handleEsc, true);
    };
  }, [isTutorialModalOpen, closeTutorialModal]);

  if (!isTutorialModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
      data-testid="tutorial-modal"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          closeTutorialModal();
        }
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
    >
      {/* Backdrop matching existing dark modal overlays */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
        onClick={closeTutorialModal}
        aria-hidden="true"
      />

      {/* Centered Responsive 1:1 Video Container Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-[460px] rounded-3xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl overflow-hidden text-[#1f1f1f] dark:text-[#e3e3e3] animate-in fade-in zoom-in-95"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo className="w-7 h-7 shrink-0" />
            <div className="min-w-0">
              <h2
                id="tutorial-modal-title"
                className="text-sm sm:text-base font-semibold tracking-tight truncate"
              >
                Bangla AI Video Tutorial
              </h2>
              <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] truncate">
                Quick walkthrough on unlocking &amp; using all models
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeTutorialModal}
            aria-label="Close tutorial video"
            data-testid="tutorial-modal-close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1:1 Responsive YouTube Embed */}
        <div className="p-3 sm:p-4 bg-[#f0f4f9] dark:bg-[#131314]">
          <div
            data-testid="tutorial-video-container"
            className="relative aspect-square w-full max-h-[72dvh] mx-auto rounded-2xl overflow-hidden bg-[#131314] border border-black/[0.08] dark:border-white/[0.08]"
          >
            <iframe
              src={TUTORIAL_EMBED_URL}
              title="Bangla AI Tutorial Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              className="w-full h-full border-0 block"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
