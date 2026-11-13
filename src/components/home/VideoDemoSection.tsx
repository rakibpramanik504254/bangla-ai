import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles } from 'lucide-react';

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
        threshold: 0.2, // Trigger when 20% of the video section is visible
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

  // Construct clean YouTube Embed URL with hidden controls:
  // - autoplay=1&mute=1: plays seamlessly muted across browsers
  // - controls=0&disablekb=1&fs=0&iv_load_policy=3: keeps default YouTube UI controls hidden
  // - loop=1&playlist=${videoId}: continuous loop
  // - playsinline=1: inline playback on mobile
  const embedUrl = isInView
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&loop=1&playlist=${videoId}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`
    : '';

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Section Header */}
      <div className="text-center mb-10 space-y-2">
        <span className="text-xs font-mono uppercase tracking-wider text-gray-400 block">
          Product Walkthrough
        </span>
        <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-black dark:text-white flex flex-wrap items-center justify-center gap-2">
          <span>See Bangla AI in Action</span>
          <Sparkles className="w-5 h-5 text-blue-500 animate-pulse shrink-0" />
        </h2>
        <p className="text-sm text-gray-500 max-w-xl mx-auto">
          Watch how effortlessly you can orchestrate 10 foundation models, synthesize complex code, and generate bilingual solutions in real time.
        </p>
      </div>

      {/* Video Frame with Ambient Glow (Clean, Unobstructed Native Controls) */}
      <div
        ref={containerRef}
        className="relative group rounded-3xl p-2 sm:p-3.5 bg-gradient-to-b from-blue-500/20 via-indigo-500/10 to-transparent dark:from-blue-500/30 dark:via-indigo-500/15 dark:to-transparent border border-blue-500/25 dark:border-blue-400/30 shadow-2xl transition-all duration-500"
      >
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#1F1F1F] border border-black/10 dark:border-white/10 shadow-inner">
          {isInView ? (
            <iframe
              src={embedUrl}
              title="Bangla AI Product Walkthrough"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              className="w-full h-full border-0 absolute inset-0 z-0 pointer-events-none select-none"
            />
          ) : (
            /* High-res poster preview while waiting for scroll */
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
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 text-black flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-black ml-1 text-black" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
