import React, { useMemo } from 'react';
import { buildMarqueeRows, type CuratedFoundationModel } from '../../utils/foundationModels.ts';

const ModelPill: React.FC<{ model: CuratedFoundationModel }> = ({ model }) => (
  <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full whitespace-nowrap bg-white dark:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.08] text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] select-none shrink-0 transition-colors hover:border-black/20 dark:hover:border-white/20">
    <img
      src={model.iconSrc}
      alt=""
      aria-hidden="true"
      className={`w-5 h-5 object-contain shrink-0 ${model.invertDark ? 'dark:invert' : ''}`}
    />
    <span>{model.name}</span>
  </div>
);

export const ModelsMarqueeSection: React.FC = () => {
  const rows = useMemo(() => buildMarqueeRows(), []);

  return (
    <section aria-label="AI Models Showcase" className="max-w-5xl mx-auto px-4 sm:px-6">
      <div className="rounded-3xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] py-12 sm:py-16 overflow-hidden">
        <div className="px-5 sm:px-10 text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-3">
          <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight leading-[1.15] text-[#1f1f1f] dark:text-[#e3e3e3] text-balance">
            All 10 leading AI models.{' '}
            <span className="whitespace-nowrap">All right here.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#444746] dark:text-[#9aa0a6] leading-[1.7] max-w-xl mx-auto">
            Access top models for chat, coding, reasoning, research, and Bengali workflows, with one unified account.
          </p>
        </div>

        <div
          className="marquee-viewport space-y-3.5 sm:space-y-4 overflow-hidden select-none"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          }}
        >
          {rows.map((row) => {
            const trackClass =
              row.direction === 'right' ? 'animate-marquee-right' : 'animate-marquee-left';

            return (
              <div key={row.id} className="overflow-hidden">
                <div
                  className={trackClass}
                  data-marquee-direction={row.direction}
                  style={{ '--marquee-duration': `${row.durationSeconds}s` } as React.CSSProperties}
                >
                  <div className="flex items-center gap-3.5 pr-3.5 shrink-0">
                    {row.halfTrackItems.map((model, idx) => (
                      <ModelPill key={`${row.id}-a-${model.id}-${idx}`} model={model} />
                    ))}
                  </div>
                  <div className="flex items-center gap-3.5 pr-3.5 shrink-0" aria-hidden="true">
                    {row.halfTrackItems.map((model, idx) => (
                      <ModelPill key={`${row.id}-b-${model.id}-${idx}`} model={model} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
