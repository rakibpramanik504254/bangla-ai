import React from 'react';
import { Sparkles, MapPin, Mail, ArrowUpRight, CheckCircle2, Shield, Facebook, Phone } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 space-y-20">
      {/* Header */}
      <div className="space-y-4 max-w-2xl">
        <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 block">
          Our Purpose & Mission
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-black dark:text-white tracking-tight leading-tight">
          Democratizing generative intelligence for Bangladesh.
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed pt-2">
          Bangla AI provides unified, distraction-free access to the world's leading foundation models through a single interface with local BDT billing via bKash, Nagad, and Rocket.
        </p>
      </div>

      {/* The Challenge & Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#0c0c0c] p-7 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] space-y-3 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">The Challenge</span>
          <h3 className="text-base font-bold text-black dark:text-white">Fragmented & Inaccessible</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Accessing OpenAI, Anthropic, and Google AI services separately requires dual-currency international cards, passport endorsements, and over $80/month in cumulative subscriptions.
          </p>
        </div>

        <div className="bg-white dark:bg-[#0c0c0c] p-7 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] space-y-3 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-black dark:text-white uppercase tracking-wider">The Solution</span>
          <h3 className="text-base font-bold text-black dark:text-white">Single Unified Platform</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            All 10 foundation models in one unified subscription at ৳1,299/month. Instant frictionless activation using Bangladesh's trusted payment channels: bKash, Nagad, and Rocket.
          </p>
        </div>
      </div>

      {/* Core Principles */}
      <div className="space-y-6">
        <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400">Architectural Principles</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="p-5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0c0c0c] flex items-start gap-3.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-black dark:text-white">Frontier Foundation Catalog</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                New cutting-edge models (Claude 3.7 Sonnet, Claude Fable 5.2, GPT-6 Astra, Gemini 4 Carbon, Grok 4.7, DeepSeek V4.1) are onboarded dynamically via server-side abstraction layers.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0c0c0c] flex items-start gap-3.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-black dark:text-white">Strict Privacy & Zero Data Reselling</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Enterprise transit safeguards ensure your confidential prompts and source code are never used to train generic public models.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0c0c0c] flex items-start gap-3.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-black dark:text-white">Engineered for Latency</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Optimized server-sent events (SSE) streaming delivering snappy sub-second token generation times.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Office & Contact */}
      <div className="p-7 rounded-[8px] bg-[#FAFAFA] dark:bg-[#121212] border border-black/[0.08] dark:border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-6 text-xs">
        <div>
          <span className="font-semibold text-black dark:text-white block">Headquarters & Inquiries</span>
          <span className="text-gray-500 mt-0.5 block">Banani Commercial Area, Dhaka-1213, Bangladesh</span>
          <span className="text-gray-400 font-mono text-[11px] block mt-1">Official Domain: bangla-ai.pro</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="https://www.facebook.com/profile.php?id=61596472081766"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-4 rounded-full border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#1a1a1a] text-black dark:text-white flex items-center justify-center gap-1.5 font-medium hover:border-black/30 transition-colors cursor-pointer"
          >
            <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
            <span>Facebook Page</span>
          </a>
          <a
            href="tel:+8801622860128"
            className="h-9 px-4 rounded-full border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#1a1a1a] text-black dark:text-white flex items-center justify-center gap-1.5 font-medium hover:border-black/30 transition-colors cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5 text-gray-500" />
            <span>+880 1622-860128</span>
          </a>
          <a
            href="mailto:ourbangla.ai@gmail.com"
            className="h-9 px-4 rounded-full border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#1a1a1a] text-black dark:text-white flex items-center justify-center gap-1.5 font-medium hover:border-black/30 transition-colors cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-gray-500" />
            <span>ourbangla.ai@gmail.com</span>
          </a>
        </div>
      </div>
    </div>
  );
};
