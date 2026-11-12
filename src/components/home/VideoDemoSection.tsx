import React, { useState, useEffect, useRef } from 'react';
import { Play, Volume2, VolumeX, Sparkles, ExternalLink } from 'lucide-react';

interface VideoDemoSectionProps {
  videoId?: string;
}

export const VideoDemoSection: React.FC<VideoDemoSectionProps> = ({
  videoId = 'HkkLswEAv8I'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  // Setup intersection observer to autoplay when user scrolls near the video
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setHasStartedPlaying(true);
          }
        });
      },
      {
        threshold: 0.25, // Trigger when 25% of the video section is visible
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Construct YouTube Embed URL with autoplay parameters
  // Browsers require mute=1 for autoplay to start without user interaction
  const embedUrl = isInView
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${
        isMuted ? '1' : '0'
      }&playsinline=1&controls=1&rel=0&modestbranding=1&enablejsapi=1`
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

      {/* Video Frame with Ambient Glow (Inspired by Minimal Spatial UI) */}
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
              className="w-full h-full border-0 absolute inset-0"
            />
          ) : (
            /* High-res poster preview while waiting for scroll */
            <div className="w-full h-full flex flex-col items-center justify-center relative cursor-pointer group"
                 onClick={() => {
                   setIsInView(true);
                   setHasStartedPlaying(true);
                 }}>
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

          {/* Quick Audio & External Controls Overlay */}
          {hasStartedPlaying && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="px-3 py-1.5 rounded-full bg-black/75 hover:bg-black text-white text-[11px] font-medium backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                title={isMuted ? 'Click to Unmute Sound' : 'Mute Sound'}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                    <span>Unmute</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sound On</span>
                  </>
                )}
              </button>

              <a
                href={`https://youtu.be/${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full bg-black/75 hover:bg-black text-white backdrop-blur-md border border-white/20 transition-colors shadow-md hidden sm:flex"
                title="Watch on YouTube"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Caption bar underneath video */}
        <div className="mt-3 px-3 py-1 flex items-center justify-between text-[11px] text-gray-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive Demo • Autoplays on Scroll</span>
          </div>
          <span className="text-gray-400 hidden sm:inline">
            10 Models • Unified Workspace • bKash / Nagad / Rocket
          </span>
        </div>
      </div>
    </section>
  );
};
