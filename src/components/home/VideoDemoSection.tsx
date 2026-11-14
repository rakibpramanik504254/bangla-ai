import React, { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';

interface VideoDemoSectionProps {
  videoId?: string;
}

export const VideoDemoSection: React.FC<VideoDemoSectionProps> = ({
  videoId = 'HkkLswEAv8I'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  // Setup intersection observer to autoplay when user scrolls near the video
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '50px 0px 50px 0px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const embedUrl = isInView
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&loop=1&playlist=${videoId}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`
    : '';

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Section Header */}
      <div className="text-center mb-10 space-y-2.5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] block">
          Product Walkthrough
        </span>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
          See Bangla AI in Action
        </h2>
        <p className="text-sm text-[#444746] dark:text-[#9aa0a6] max-w-xl mx-auto leading-[1.7]">
          Watch how effortlessly you can orchestrate 10 foundation models, synthesize complex code, and generate bilingual solutions in real time.
        </p>
      </div>

      {/* Video Frame inside Tonal Container */}
      <div
        ref={containerRef}
        className="relative group rounded-3xl p-2 sm:p-3 bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] transition-colors"
      >
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#131314] border border-black/[0.08] dark:border-white/[0.08]">
          {isInView ? (
            <iframe
              src={embedUrl}
              title="Bangla AI Product Walkthrough"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              className="w-full h-full border-0 absolute inset-0 z-0 pointer-events-none select-none"
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center relative cursor-pointer group"
              onClick={() => setIsInView(true)}
            >
              <img
                src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                alt="Bangla AI Demo Video"
                className="w-full h-full object-cover opacity-85 group-hover:opacity-95 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 text-[#1f1f1f] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-[#1f1f1f] ml-1 text-[#1f1f1f]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
