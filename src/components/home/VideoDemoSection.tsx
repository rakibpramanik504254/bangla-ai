import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles, ExternalLink } from 'lucide-react';

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

  // Construct YouTube Embed URL:
  // - autoplay=1: autoplays when loaded
  // - mute=1: muted so it plays continuously across all browsers
  // - controls=1: shows native YouTube playback controls (play, pause, seek, volume, fullscreen)
  // - loop=1&playlist=${videoId}: continuously loops and keeps playing
  // - playsinline=1: inline playback on mobile
  // - rel=0: related videos from same channel
  const embedUrl = isInView
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=1&loop=1&playlist=${videoId}&playsinline=1&rel=0&modestbranding=0&enablejsapi=1`
    : '';

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Section Header */}
      <div className="text-center mb-10 space-y-2">
        <span className="text-xs font-mono uppercase tracking-wider text-gray-400 block">
          Product Walkthrough
        </span>
        <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-black dark:text-white flex items-center justify-center gap-2">
          <span>See Bangla AI in Action</span>
          <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
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
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-black/10 dark:border-white/10 shadow-inner">
          {isInView ? (
            <iframe
              src={embedUrl}
              title="Bangla AI Product Walkthrough"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0 absolute inset-0 z-0"
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

        {/* Caption bar underneath video */}
        <div className="mt-3 px-3 py-1 flex items-center justify-between text-[11px] text-gray-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Looping Muted with Controls • Unmute anytime via player controls</span>
          </div>
          <a
            href={`https://youtu.be/${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1"
          >
            <span>Open in YouTube</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </section>
  );
};
