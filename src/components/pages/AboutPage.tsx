import React from 'react';
import { Sparkles, MapPin, Mail, ArrowUpRight, CheckCircle2, Shield } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-16">
      {/* Header */}
      <div className="space-y-3">
        <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block">
          Our Purpose & Mission
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-950 dark:text-white tracking-tight">
          Democratizing AI for Bangladesh.
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed pt-2">
          Bangla AI provides seamless, unified access to the world's leading generative intelligence models through one modern, distraction-free interface with local currency billing.
        </p>
      </div>

      {/* The Challenge & Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800/80 space-y-2">
          <span className="text-xs font-mono font-bold text-gray-400 uppercase">The Challenge</span>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Fragmented & Inaccessible</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Accessing OpenAI, Anthropic, and Google AI services separately requires dual-currency international cards, passport endorsements, and over $80/month in cumulative subscriptions.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800/80 space-y-2">
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">The Solution</span>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Single Unified Platform</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            All foundation models in one unified subscription at ৳1,299/month. Instant frictionless activation using Bangladesh's trusted payment channels: bKash, Nagad, and Rocket.
          </p>
        </div>
      </div>

      {/* Core Principles */}
      <div className="space-y-4">
        <h3 className="text-sm font-mono uppercase tracking-wider text-gray-400">Our Architectural Principles</h3>
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">Provider Modularity</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                New cutting-edge models are onboarded dynamically via server-side abstraction layers without interface disruption.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">Strict Privacy & Zero Data Reselling</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Enterprise transit safeguards ensure your confidential prompts and source code are never used to train generic public models.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">Engineered for Latency</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Optimized SSE streaming with local edge routing delivering snappy sub-second token generation times.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Office & Contact */}
      <div className="p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div>
          <span className="font-semibold text-gray-900 dark:text-white block">Headquarters</span>
          <span className="text-gray-500 dark:text-gray-400">Level 7, Banani Commercial Area, Dhaka-1213, Bangladesh</span>
        </div>
        <div className="text-left sm:text-right">
          <span className="font-semibold text-gray-900 dark:text-white block">Inquiries</span>
          <span className="text-gray-500 dark:text-gray-400 font-mono">support@bangla.ai</span>
        </div>
      </div>
    </div>
  );
};
