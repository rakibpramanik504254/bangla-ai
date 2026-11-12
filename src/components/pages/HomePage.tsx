import React from 'react';
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Sparkles,
  Bot,
  Brain,
  Code2,
  Cpu,
  Zap
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
    <div className="space-y-20 sm:space-y-28 py-12 sm:py-20 animate-in fade-in transition-colors bg-white dark:bg-[#0A0A0A] text-black dark:text-white">
      {/* Hero Region (OpenAI Minimal Spacious Center) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 text-xs font-medium text-gray-700 dark:text-gray-300">
            <span>Unified Multi-Model AI Hub for Bangladesh</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.12] text-black dark:text-white max-w-3xl mx-auto">
            Every top AI model.
            <span className="block font-medium text-gray-500 dark:text-gray-400 mt-1">
              One sparse, high-clarity interface.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-normal">
            Access Claude Fable 5.2, Gemini 4 Carbon, GPT-6 Astra, Grok 4.7, and DeepSeek with unified context. Pay in Bangladeshi Taka via bKash, Nagad, and Rocket without credit card restrictions.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
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
              className="btn-pill-primary w-full sm:w-auto h-11 px-6 text-sm"
            >
              <span>{isSubscribed ? 'Open AI Workspace' : 'Get Started with Bangla AI'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={() => {
                document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-pill-secondary w-full sm:w-auto h-11 px-6 text-sm"
            >
              View Plans from ৳1,299
            </button>
          </div>

          {/* Key Metrics Strip (Clean Typography, No Pill Enclosures) */}
          <div className="pt-12 mt-6 border-t border-black/[0.06] dark:border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold tracking-tight text-black dark:text-white">10+ Models</p>
              <p className="text-xs text-gray-500 mt-1">Claude Fable, Gemini 4, GPT-6, Grok</p>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-black dark:text-white">Direct MFS</p>
              <p className="text-xs text-gray-500 mt-1">bKash, Nagad & Rocket verification</p>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-black dark:text-white">Low Latency</p>
              <p className="text-xs text-gray-500 mt-1">Real-time token streaming engine</p>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-black dark:text-white">99.9%</p>
              <p className="text-xs text-gray-500 mt-1">Reliable enterprise uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Model Catalog Section (OpenAI Minimal Cards: 8px Radius, 1px Border) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-black dark:text-white">
            Curated Foundation Models
          </h2>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            Consolidate fragmented $20/month overseas AI subscriptions into one seamless workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Gemini 4 Carbon */}
          <div className="card-minimal flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Google</span>
                <span>·</span>
                <span>2M Context</span>
                <span>·</span>
                <span className="font-mono text-[10px] uppercase font-bold text-black dark:text-white">HIGH</span>
              </div>
              <h3 className="text-base font-semibold text-black dark:text-white">Gemini 4 Carbon (high)</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Next-generation Google Carbon architecture with massive 2M token context, high-throughput multimodal intelligence, and instantaneous response streaming.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400">
              Low Latency • Multimodal
            </div>
          </div>

          {/* Claude Fable 5.2 */}
          <div className="card-minimal flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Anthropic</span>
                <span>·</span>
                <span>500k Context</span>
                <span>·</span>
                <span className="font-mono text-[10px] uppercase font-bold text-black dark:text-white">MAX</span>
              </div>
              <h3 className="text-base font-semibold text-black dark:text-white">Claude Fable 5.2 (max)</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Anthropic's pinnacle intelligence. Exceptional software engineering, complex system architecture design, and nuanced prose refinement.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400">
              Coding Specialist • Literary Precision
            </div>
          </div>

          {/* GPT-6 Astra */}
          <div className="card-minimal flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>OpenAI</span>
                <span>·</span>
                <span>1M Context</span>
                <span>·</span>
                <span className="font-mono text-[10px] uppercase font-bold text-black dark:text-white">MAX</span>
              </div>
              <h3 className="text-base font-semibold text-black dark:text-white">GPT-6 Astra (max)</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                OpenAI frontier flagship. Maximum general intelligence, autonomous systems design, and multi-step cross-domain problem solving.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400">
              Frontier Reasoning • Generalist
            </div>
          </div>

          {/* DeepSeek V4.1 Flash 1017 */}
          <div className="card-minimal flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>DeepSeek</span>
                <span>·</span>
                <span>128k Context</span>
                <span>·</span>
                <span className="font-mono text-[10px] uppercase font-bold text-black dark:text-white">MAX</span>
              </div>
              <h3 className="text-base font-semibold text-black dark:text-white">DeepSeek V4.1 Flash 1017</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Next-gen MoE architecture offering instantaneous response velocity combined with rigorous chain-of-thought mathematical proof verification.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400">
              Ultra Dense MoE • Math & Logic
            </div>
          </div>

          {/* Grok 4.7 */}
          <div className="card-minimal flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>xAI</span>
                <span>·</span>
                <span>256k Context</span>
                <span>·</span>
                <span className="font-mono text-[10px] uppercase font-bold text-black dark:text-white">XHIGH</span>
              </div>
              <h3 className="text-base font-semibold text-black dark:text-white">Grok 4.7 (xhigh)</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                xAI's extreme inference engine. Direct real-time insight synthesis, high-throughput multi-agent orchestration, and uncompromising technical clarity.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400">
              Extreme Inference • Real-time
            </div>
          </div>

          {/* Kimi K3.1 Pro */}
          <div className="card-minimal flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Moonshot</span>
                <span>·</span>
                <span>2M Context</span>
                <span>·</span>
                <span className="font-mono text-[10px] uppercase font-bold text-black dark:text-white">REASONING</span>
              </div>
              <h3 className="text-base font-semibold text-black dark:text-white">Kimi K3.1 Pro</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Moonshot flagship with native 2M context handling. Specialized in massive document digests, legal contracts, and academic synthesis.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400">
              Document Synthesis • Long Context
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (OpenAI Minimal Restrained Contrast) */}
      <section id="pricing-section" className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-gray-400 block">
            Pricing
          </span>
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-black dark:text-white">
            Simple, Transparent Subscription
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Choose the subscription that matches your workflow. Activate instantly with bKash, Nagad, or Rocket.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Monthly Plan */}
          <div className="card-minimal p-7 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-black dark:text-white">Monthly Plan</h3>
                <span className="text-xs text-gray-500 font-medium">Flexible</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Ideal for individuals getting started with AI</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-bold text-black dark:text-white font-mono">
                  {formatBDT(PLANS.monthly.priceBDT)}
                </span>
                <span className="text-xs text-gray-500">/ month</span>
              </div>

              <div className="mt-6 space-y-2.5 border-t border-black/[0.06] dark:border-white/[0.06] pt-5">
                {PLANS.monthly.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <Check className="w-3.5 h-3.5 text-black dark:text-white shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 pt-2">
              <button
                onClick={() => {
                  if (!user) {
                    openAuthModal('register');
                  } else {
                    openPaymentModal('monthly');
                  }
                }}
                className="btn-pill-secondary w-full text-center"
              >
                Subscribe Monthly (৳1,299)
              </button>
            </div>
          </div>

          {/* Yearly Plan (Emphasis Card) */}
          <div className="card-minimal p-7 flex flex-col justify-between border-black/20 dark:border-white/25 shadow-sm relative">
            <span className="absolute top-5 right-5 text-[11px] font-mono text-gray-500 dark:text-gray-400">
              SAVE 36%
            </span>

            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-black dark:text-white">Yearly Plan</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">Best value for power users and professionals</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-bold text-black dark:text-white font-mono">
                  {formatBDT(PLANS.yearly.priceBDT)}
                </span>
                <span className="text-xs text-gray-500">/ year</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Equivalent to ৳833/month
              </p>

              <div className="mt-6 space-y-2.5 border-t border-black/[0.06] dark:border-white/[0.06] pt-5">
                {PLANS.yearly.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <Check className="w-3.5 h-3.5 text-black dark:text-white shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 pt-2">
              <button
                onClick={() => {
                  if (!user) {
                    openAuthModal('register');
                  } else {
                    openPaymentModal('yearly');
                  }
                }}
                className="btn-pill-primary w-full text-center"
              >
                Subscribe Yearly (৳9,999)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MFS Trust Section (Clean Monochrome Separator) */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="card-minimal p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <ShieldCheck className="w-4 h-4 text-black dark:text-white" />
            <span>Supported payment channels:</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-black dark:text-white">
            <span>bKash</span>
            <span>·</span>
            <span>Nagad</span>
            <span>·</span>
            <span>Rocket</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="text-xl font-medium text-black dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <div className="card-minimal p-4">
            <h4 className="font-semibold text-black dark:text-white">
              Can I switch between Gemini, GPT-6, and Claude within the same conversation?
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
              Yes. You can switch your preferred foundation model at any time from the top selector in the workspace. Your conversational history is preserved.
            </p>
          </div>

          <div className="card-minimal p-4">
            <h4 className="font-semibold text-black dark:text-white">
              How quickly is my plan activated after bKash or Nagad transfer?
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
              Activation is immediate upon entering your sender mobile number and SMS Transaction ID (TrxID) in the checkout modal.
            </p>
          </div>

          <div className="card-minimal p-4">
            <h4 className="font-semibold text-black dark:text-white">
              What happens if I exhaust my token quota?
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
              The 50,000 token monthly quota supports thousands of standard prompts. If additional capacity is needed, limits can be renewed or upgraded anytime.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
