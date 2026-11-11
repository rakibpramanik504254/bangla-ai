import React from 'react';
import {
  Sparkles,
  Bot,
  Brain,
  Code2,
  Check,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { PLANS, formatBDT } from '../../utils/billing.ts';

interface HomePageProps {
  onStartChat: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStartChat }) => {
  const { user, openAuthModal, openPaymentModal } = useAuth();
  const isSubscribed = user?.isSubscribed || user?.role === 'admin';

  return (
    <div className="space-y-24 pb-24">
      {/* Hero Section - Minimal & Premium */}
      <section className="relative pt-16 sm:pt-24 pb-16 overflow-hidden">
        {/* Subtle radial background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-b from-gray-200/50 to-transparent dark:from-gray-800/20 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Next-Gen Multi-Model AI Infrastructure for Bangladesh</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-950 dark:text-white tracking-tight leading-[1.12]">
            Unified Intelligence.
            <span className="block mt-1 text-gray-400 dark:text-gray-500 font-normal">
              Every Top AI Model. One Interface.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-normal">
            Switch effortlessly between Google Gemini 2.5, OpenAI GPT-4o, Anthropic Claude 3.5, and DeepSeek R1. Pay easily in Bangladeshi Taka (৳) via bKash, Nagad, or Cards without foreign exchange limits.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                if (!user) {
                  openAuthModal('register');
                } else if (!isSubscribed) {
                  openPaymentModal('monthly');
                } else {
                  onStartChat();
                }
              }}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 group"
            >
              <span>{isSubscribed ? 'Open AI Workspace' : 'Get Started with Bangla AI'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => {
                document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium text-sm transition-colors"
            >
              View Plans from ৳1,299
            </button>
          </div>

          {/* Minimal Key Metrics */}
          <div className="mt-14 pt-8 border-t border-gray-100 dark:border-gray-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">4+ Models</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Gemini, GPT-4o, Claude, DeepSeek</p>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Zero Cards</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Direct bKash & Nagad checkout</p>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Streaming</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Real-time low-latency response</p>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">99.9%</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">High availability uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Model Aggregation Showcase */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Curated Foundation Models
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-lg mx-auto">
            Instead of managing multiple $20/month foreign subscriptions totaling over $80+ (৳10,000+), access them all under one unified subscription.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gemini */}
          <div className="bg-white dark:bg-gray-900/60 rounded-2xl p-5 border border-gray-100 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                  Google
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Gemini 2.5 Pro & Flash</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                Massive 1M+ token context window. Built for deep document research and ultra-rapid general assistance.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/60 text-[11px] font-mono text-gray-400">
              Low Latency • High Context
            </div>
          </div>

          {/* OpenAI */}
          <div className="bg-white dark:bg-gray-900/60 rounded-2xl p-5 border border-gray-100 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                  OpenAI
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">GPT-4o (Omni)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                Industry-standard multimodal intelligence. Unmatched in creative writing, strategy formulation, and nuanced dialogue.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/60 text-[11px] font-mono text-gray-400">
              Balanced • Versatile
            </div>
          </div>

          {/* Claude */}
          <div className="bg-white dark:bg-gray-900/60 rounded-2xl p-5 border border-gray-100 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-xs">
                  <Code2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                  Anthropic
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Claude 3.5 Sonnet</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                Preferred by software engineers. Superior code synthesis, complex refactoring, and natural prose styling.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/60 text-[11px] font-mono text-gray-400">
              Coding • Analytical
            </div>
          </div>

          {/* DeepSeek */}
          <div className="bg-white dark:bg-gray-900/60 rounded-2xl p-5 border border-gray-100 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-xs">
                  <Brain className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                  DeepSeek
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">DeepSeek R1</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                State-of-the-art chain-of-thought reasoning model for mathematics, algorithmic logic, and formal proofs.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/60 text-[11px] font-mono text-gray-400">
              Reasoning • Logic proofs
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing-section" className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block mb-1">
            Predictable Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Simple, Transparent Plans
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
            Choose the subscription that matches your workflow. Cancel or upgrade anytime with instant MFS checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Monthly Plan */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-7 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Monthly Plan</h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  Flexible
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Ideal for individuals getting started with AI</p>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white font-mono">
                  {formatBDT(PLANS.monthly.priceBDT)}
                </span>
                <span className="text-xs text-gray-500">/ month</span>
              </div>

              <div className="mt-8 space-y-3 border-t border-gray-100 dark:border-gray-800/80 pt-6">
                {PLANS.monthly.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
                    <Check className="w-3.5 h-3.5 text-gray-900 dark:text-white shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-2">
              <button
                onClick={() => {
                  if (!user) {
                    openAuthModal('register');
                  } else {
                    openPaymentModal('monthly');
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white font-semibold text-xs transition-all text-center"
              >
                Subscribe Monthly (৳1,299)
              </button>
            </div>
          </div>

          {/* Yearly Plan - Featured */}
          <div className="bg-gray-950 text-white dark:bg-white dark:text-gray-950 rounded-3xl p-7 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <span className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">
              SAVE 36%
            </span>

            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Yearly Plan</h3>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Best value for power users and teams</p>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold font-mono">
                  {formatBDT(PLANS.yearly.priceBDT)}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-600">/ year</span>
              </div>
              <p className="text-xs text-emerald-400 dark:text-emerald-600 font-medium mt-1">
                Equivalent to just ৳833/month
              </p>

              <div className="mt-8 space-y-3 border-t border-gray-800 dark:border-gray-200 pt-6">
                {PLANS.yearly.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-300 dark:text-gray-700">
                    <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-2">
              <button
                onClick={() => {
                  if (!user) {
                    openAuthModal('register');
                  } else {
                    openPaymentModal('yearly');
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-950 dark:bg-gray-950 dark:hover:bg-black dark:text-white font-semibold text-xs shadow-sm transition-all text-center"
              >
                Subscribe Yearly (৳9,999)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Local Payment Badges */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl p-5 border border-gray-100 dark:border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-gray-500 shrink-0" />
            <span className="text-gray-600 dark:text-gray-400">
              Trusted Bangladesh payment gateways supported:
            </span>
          </div>
          <div className="flex items-center gap-2 font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[#E2136E]">bKash</span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[#F7941D]">Nagad</span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[#8C3494]">Rocket</span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cards</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800/80">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Can I switch between Gemini, GPT-4o, and Claude within the same conversation?
            </h4>
            <p className="text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Yes. You can toggle your preferred foundation model anytime using the top model selector. Your session context remains preserved.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800/80">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              How quickly is my account activated after bKash or Nagad payment?
            </h4>
            <p className="text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Activation is instantaneous upon submitting your Transaction ID (TrxID) in the checkout modal.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800/80">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              What happens if I exhaust my monthly token limit?
            </h4>
            <p className="text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              The 50,000 token monthly quota accommodates thousands of standard queries. If you require higher throughput, limits can be customized by contacting support or through plan renewal.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
