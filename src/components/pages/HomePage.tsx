import React, { useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  Code2,
  Cpu,
  Zap,
  Globe2,
  FileCheck2,
  Layers,
  TrendingUp,
  Laptop,
  Briefcase,
  GraduationCap,
  Megaphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { VideoDemoSection } from '../home/VideoDemoSection.tsx';
import { SmarterWorkflowsSection } from '../home/SmarterWorkflowsSection.tsx';
import { CodeIdeHighlight } from '../home/CodeIdeHighlight.tsx';
import { ModelsMarqueeSection } from '../home/ModelsMarqueeSection.tsx';
import { PricingComparisonSection } from '../home/PricingComparisonSection.tsx';
import { FaqSection } from '../home/FaqSection.tsx';
import { CURATED_MODEL_MAP } from '../../utils/foundationModels.ts';

interface HomePageProps {
  onStartChat: () => void;
}

interface PromptSample {
  id: string;
  category: string;
  prompt: string;
  models: {
    modelName: string;
    badge: string;
    output: string;
  }[];
}

const SAMPLE_BENCHMARKS: PromptSample[] = [
  {
    id: 'coding',
    category: 'Full-Stack Engineering',
    prompt: 'Write an optimized React hook with TypeScript for debounced asynchronous search with abort-controller cleanup.',
    models: [
      {
        modelName: 'Claude Fable 5.2 (max)',
        badge: 'Anthropic Flagship',
        output: `export function useDebouncedSearch<T>(query: string, searcher: (q: string, signal: AbortSignal) => Promise<T[]>, delay = 300) {\n  const [data, setData] = useState<T[]>([]);\n  const [loading, setLoading] = useState(false);\n  useEffect(() => {\n    if (!query.trim()) { setData([]); return; }\n    const controller = new AbortController();\n    const timer = setTimeout(async () => {\n      setLoading(true);\n      try {\n        const results = await searcher(query, controller.signal);\n        setData(results);\n      } catch (err: any) {\n        if (err.name !== 'AbortError') console.error(err);\n      } finally { setLoading(false); }\n    }, delay);\n    return () => { clearTimeout(timer); controller.abort(); };\n  }, [query, delay]);\n  return { data, loading };\n}`
      },
      {
        modelName: 'GPT-6 Astra (max)',
        badge: 'OpenAI Frontier',
        output: `// Production-hardened with stale response cancellation & retry buffer\nimport { useState, useEffect, useRef } from 'react';\n\nexport const useDebouncedSearch = <T>(query: string, delay: number = 300) => {\n  const [results, setResults] = useState<T[]>([]);\n  const [isPending, setIsPending] = useState(false);\n  const activeController = useRef<AbortController | null>(null);\n  // Handles race conditions & zero-flicker UI updates cleanly...\n};`
      },
      {
        modelName: 'Gemini 4 Carbon (high)',
        badge: 'Google Carbon',
        output: `// High throughput streaming debounce hook with 2M token context memory\nconst useFastSearch = (term: string) => {\n  // Optimized for sub-millisecond AST parsing and instant UI hydration\n};`
      }
    ]
  },
  {
    id: 'bangla',
    category: 'Bangla Copywriting & Marketing',
    prompt: 'বাংলাদেশের তরুণ উদ্যোক্তা ও ফ্রিল্যান্সারদের জন্য একটি উচ্চ রূপান্তরকারী (high-converting) ফেসবুক অ্যাড কপি লিখুন।',
    models: [
      {
        modelName: 'GPT-6 Astra (max)',
        badge: 'OpenAI Frontier',
        output: `🎯 ডুয়েল কারেন্সি কার্ডের ঝামেলা ছাড়াই ব্যবহার করুন বিশ্বের সেরা AI মডেল!\n\nআপনি কি আপওয়ার্ক বা ফাইভারের ফ্রিল্যান্সার? প্রতিদিন কোডিং, ক্লায়েন্ট কমিউনিকেশন বা কনটেন্ট তৈরিতে ঘণ্টার পর ঘণ্টা সময় নষ্ট করছেন?\n\nএখন বিকাশ, নগদ ও রকেটে সাবস্ক্রিপশন নিয়ে একসাথে পান:\n✨ Claude Fable 5.2 • GPT-6 Astra • Gemini 4 Carbon • DeepSeek\n\n👉 আজই শুরু করুন Bangla AI দিয়ে। আপনার প্রোডাক্টিভিটি বাড়ান ১০ গুণ!`
      },
      {
        modelName: 'Claude Fable 5.2 (max)',
        badge: 'Anthropic Flagship',
        output: `দক্ষতাই আপনার মূলধন—প্রযুক্তির অভাব যেন আপনার অগ্রযাত্রাকে আটকে না রাখে।\n\nআন্তর্জাতিক পেমেন্ট গেটওয়ের জটিলতা ভুলে বাংলাদেশের নিজস্ব লোকাল পেমেন্ট (bKash/Nagad/Rocket) সিস্টেমে সরাসরি অ্যাক্সেস নিন বিশ্বের সবচেয়ে শক্তিশালী ১০টি কৃত্রিম বুদ্ধিমত্তা মডেলে।\n\nএক ক্লিকে কোডিং সমাধান, নির্ভুল বাংলা-ইংরেজি অনুবাদ ও ব্যবসায়িক পরিকল্পনা তৈরি করুন।`
      }
    ]
  },
  {
    id: 'reasoning',
    category: 'Data & Mathematical Logic',
    prompt: 'Compare time complexities of graph Dijkstra vs A* search in dense Euclidean graphs with admissible heuristics.',
    models: [
      {
        modelName: 'DeepSeek V4.1 Flash 1017 (max)',
        badge: 'DeepSeek MoE',
        output: `Analysis:\n1. Dijkstra: O(|E| + |V| log |V|) with Fibonacci heap. Explores equidistant spherical wavefronts.\n2. A* with consistent Euclidean heuristic h(n) <= c(n, p) + h(p):\n   Strictly dominates Dijkstra in visited node set S(A*) ⊆ S(Dijkstra).\n3. Dense Graph (|E| ≈ |V|^2): Reduces to O(|V|^2). Directed ellipsoid search cone yields ~78% fewer state expansions.`
      },
      {
        modelName: 'Kimi K3.1 Pro',
        badge: 'Moonshot 2M',
        output: `Rigorous mathematical comparison:\nLet G=(V,E) be a finite directed graph. Under Euclidean distance metric spaces d(u,v) = ||u - v||_2, the triangle inequality guarantees monotonic consistency. Consequently, A* expands the absolute minimal number of vertices among all search algorithms with access to h.`
      }
    ]
  }
];

export const HomePage: React.FC<HomePageProps> = ({ onStartChat }) => {
  const { user, openAuthModal, openPaymentModal } = useAuth();
  const isSubscribed = user?.isSubscribed || user?.role === 'admin';

  const [activeBenchmarkTab, setActiveBenchmarkTab] = useState(0);
  const [activeModelTab, setActiveModelTab] = useState(0);

  return (
    <div className="space-y-20 sm:space-y-28 py-10 sm:py-20 overflow-x-clip animate-in fade-in transition-colors bg-white dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3]">
      {/* Hero Region */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="space-y-6">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#1e1f20] text-[11px] sm:text-xs font-medium text-[#444746] dark:text-[#9aa0a6] max-w-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Bangla AI • All 10 Frontier AI Models in One Hub</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.12] text-[#1f1f1f] dark:text-[#e3e3e3] max-w-3xl mx-auto">
            Every top AI model.
            <span className="block font-medium text-[#444746] dark:text-[#9aa0a6] mt-1">
              One clean, simple interface.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#444746] dark:text-[#9aa0a6] max-w-2xl mx-auto leading-[1.7] font-normal">
            Access Claude Fable 5.2, Gemini 4 Carbon, GPT-6 Astra, Grok 4.7, and DeepSeek V4.1 with unified conversation memory. Pay easily in Bangladeshi Taka via bKash, Nagad, and Rocket without dual-currency card barriers.
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
              className="btn-pill-primary w-full sm:w-auto h-11 px-7 text-sm cursor-pointer"
            >
              <span>{isSubscribed ? 'Open AI Workspace' : 'Get Started with Bangla AI'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={() => {
                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-pill-secondary w-full sm:w-auto h-11 px-7 text-sm cursor-pointer"
            >
              View Plans from ৳699
            </button>
          </div>

          {/* Key Metrics Strip */}
          <div className="pt-10 sm:pt-12 mt-6 border-t border-black/[0.08] dark:border-white/[0.08] grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">10+ Models</p>
              <p className="text-[11px] sm:text-xs text-[#444746] dark:text-[#9aa0a6] mt-1">Claude Fable, Gemini 4, GPT-6, Grok</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">Direct MFS</p>
              <p className="text-[11px] sm:text-xs text-[#444746] dark:text-[#9aa0a6] mt-1">bKash, Nagad & Rocket verification</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">Zero Cards</p>
              <p className="text-[11px] sm:text-xs text-[#444746] dark:text-[#9aa0a6] mt-1">No dual currency passport hassle</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">99.9%</p>
              <p className="text-[11px] sm:text-xs text-[#444746] dark:text-[#9aa0a6] mt-1">High-throughput uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section: "Why Bangla AI vs Individual Subscriptions" */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] block">
            Cost & Value Comparison
          </span>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
            Why Bangla AI vs Buying Individual Plans
          </h2>
          <p className="text-sm text-[#444746] dark:text-[#9aa0a6] max-w-xl mx-auto leading-[1.7]">
            Purchasing ChatGPT Plus, Claude Pro, and Grok separately costs over $80/month (~৳10,000 BDT) and requires an endorsed international credit card. Bangla AI unites them into a single subscription.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#1e1f20] p-2 sm:p-3">
          <div className="overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#131314]">
            {/* Mobile Stacked Comparison Cards */}
            <div className="sm:hidden divide-y divide-black/[0.06] dark:divide-white/[0.06] text-xs">
              {[
                {
                  label: 'Monthly Subscription Cost',
                  separate: '$80+ / mo (~৳10,000+ BDT)',
                  unified: '৳699 / mo (Save 93%)',
                  highlight: true
                },
                {
                  label: 'Payment Method in Bangladesh',
                  separate: 'Passport-endorsed Dual Currency Credit Card required',
                  unified: 'bKash, Nagad, Rocket (TrxID)'
                },
                {
                  label: 'Catalog of Top Foundation Models',
                  separate: '1 model per subscription tab',
                  unified: '10 Flagship Models in 1 Account'
                },
                {
                  label: 'Cross-Model Workflow Switcher',
                  separate: 'Manual copy-pasting across different browser tabs',
                  unified: 'Switch model in-flight with continuous context'
                },
                {
                  label: 'Customer Support & Verification',
                  separate: 'Overseas automated chatbot',
                  unified: 'Dedicated Bangladesh Support Team'
                }
              ].map((row) => (
                <div key={row.label} className="p-4 space-y-2.5">
                  <p className="font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">{row.label}</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="p-3 rounded-xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.06] dark:border-white/[0.06]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] block mb-0.5">
                        Separate Plans
                      </span>
                      <span className="text-[#444746] dark:text-[#9aa0a6] leading-snug block">{row.separate}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08] border border-emerald-500/20">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-0.5">
                        Bangla AI (Unified)
                      </span>
                      <span className={`leading-snug block ${row.highlight ? 'font-bold font-mono text-emerald-700 dark:text-emerald-400' : 'font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]'}`}>
                        {row.unified}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Comparison Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f0f4f9] dark:bg-[#1e1f20] border-b border-black/[0.08] dark:border-white/[0.08] font-mono text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                  <tr>
                    <th className="py-4 px-5 font-semibold">Features & Capabilities</th>
                    <th className="py-4 px-5 font-semibold text-[#444746] dark:text-[#9aa0a6]">Separate AI Subscriptions</th>
                    <th className="py-4 px-5 font-bold text-[#1f1f1f] dark:text-[#e3e3e3] bg-[#e9eef6]/70 dark:bg-[#282a2c]/70">
                      Bangla AI (Unified)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                  <tr className="hover:bg-[#f0f4f9]/40 dark:hover:bg-[#1e1f20]/40 transition-colors">
                    <td className="py-3.5 px-5 font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">Monthly Subscription Cost</td>
                    <td className="py-3.5 px-5 text-[#444746] dark:text-[#9aa0a6] font-mono">$80+ / mo (~৳10,000+ BDT)</td>
                    <td className="py-3.5 px-5 font-bold text-emerald-700 dark:text-emerald-400 font-mono bg-[#e9eef6]/35 dark:bg-[#282a2c]/35">
                      ৳699 / mo (Save 93%)
                    </td>
                  </tr>
                  <tr className="hover:bg-[#f0f4f9]/40 dark:hover:bg-[#1e1f20]/40 transition-colors">
                    <td className="py-3.5 px-5 font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">Payment Method in Bangladesh</td>
                    <td className="py-3.5 px-5 text-[#444746] dark:text-[#9aa0a6]">Passport-endorsed Dual Currency Credit Card required</td>
                    <td className="py-3.5 px-5 font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] bg-[#e9eef6]/35 dark:bg-[#282a2c]/35">
                      bKash, Nagad, Rocket (TrxID)
                    </td>
                  </tr>
                  <tr className="hover:bg-[#f0f4f9]/40 dark:hover:bg-[#1e1f20]/40 transition-colors">
                    <td className="py-3.5 px-5 font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">Catalog of Top Foundation Models</td>
                    <td className="py-3.5 px-5 text-[#444746] dark:text-[#9aa0a6]">1 model per subscription tab</td>
                    <td className="py-3.5 px-5 font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] bg-[#e9eef6]/35 dark:bg-[#282a2c]/35">
                      10 Flagship Models in 1 Account
                    </td>
                  </tr>
                  <tr className="hover:bg-[#f0f4f9]/40 dark:hover:bg-[#1e1f20]/40 transition-colors">
                    <td className="py-3.5 px-5 font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">Cross-Model Workflow Switcher</td>
                    <td className="py-3.5 px-5 text-[#444746] dark:text-[#9aa0a6]">Manual copy-pasting across different browser tabs</td>
                    <td className="py-3.5 px-5 font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] bg-[#e9eef6]/35 dark:bg-[#282a2c]/35">
                      Switch model in-flight with continuous context
                    </td>
                  </tr>
                  <tr className="hover:bg-[#f0f4f9]/40 dark:hover:bg-[#1e1f20]/40 transition-colors">
                    <td className="py-3.5 px-5 font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">Customer Support & Verification</td>
                    <td className="py-3.5 px-5 text-[#444746] dark:text-[#9aa0a6]">Overseas automated chatbot</td>
                    <td className="py-3.5 px-5 font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] bg-[#e9eef6]/35 dark:bg-[#282a2c]/35">
                      Dedicated Bangladesh Support Team
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Curated Foundation Models (6 Flagship Models Displayed Cleanly) */}
      <section data-testid="curated-models-section" className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] block">
            Engine Fleet
          </span>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
            6 Curated Foundation Models
          </h2>
          <p className="text-sm text-[#444746] dark:text-[#9aa0a6] max-w-lg mx-auto leading-[1.7]">
            State-of-the-art weights from Anthropic, Google, OpenAI, xAI, DeepSeek, and Moonshot ready for production tasks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Claude Fable 5.2 */}
          <div className="card-minimal flex flex-col justify-between p-5 group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#444746] dark:text-[#9aa0a6]">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>Anthropic</span>
                  <span>·</span>
                  <span>500k Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-semibold text-[#444746] dark:text-[#9aa0a6] px-2 py-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08]">
                  MAX
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                  <img
                    src={CURATED_MODEL_MAP['claude-fable-5-2'].iconSrc}
                    alt={CURATED_MODEL_MAP['claude-fable-5-2'].iconAlt}
                    className="w-[18px] h-[18px] object-contain"
                  />
                </div>
                <h3 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                  Claude Fable 5.2 (max)
                </h3>
              </div>
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
                Anthropic's pinnacle intelligence. Exceptional software engineering, complex system architecture design, and nuanced prose refinement.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-[#444746] dark:text-[#9aa0a6] font-mono">
              Coding Specialist • Literary Precision
            </div>
          </div>

          {/* 2. Gemini 4 Carbon */}
          <div className="card-minimal flex flex-col justify-between p-5 group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#444746] dark:text-[#9aa0a6]">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>Google</span>
                  <span>·</span>
                  <span>2M Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-semibold text-[#444746] dark:text-[#9aa0a6] px-2 py-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08]">
                  HIGH
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                  <img
                    src={CURATED_MODEL_MAP['gemini-4-carbon'].iconSrc}
                    alt={CURATED_MODEL_MAP['gemini-4-carbon'].iconAlt}
                    className="w-[18px] h-[18px] object-contain"
                  />
                </div>
                <h3 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                  Gemini 4 Carbon (high)
                </h3>
              </div>
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
                Next-generation Google Carbon architecture with massive 2M token context, high-throughput multimodal intelligence, and instantaneous response streaming.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-[#444746] dark:text-[#9aa0a6] font-mono">
              2M Context • Low Latency Multimodal
            </div>
          </div>

          {/* 3. GPT-6 Astra */}
          <div className="card-minimal flex flex-col justify-between p-5 group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#444746] dark:text-[#9aa0a6]">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>OpenAI</span>
                  <span>·</span>
                  <span>1M Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-semibold text-[#444746] dark:text-[#9aa0a6] px-2 py-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08]">
                  MAX
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                  <img
                    src={CURATED_MODEL_MAP['gpt-6-astra'].iconSrc}
                    alt={CURATED_MODEL_MAP['gpt-6-astra'].iconAlt}
                    className="w-[18px] h-[18px] object-contain dark:invert"
                  />
                </div>
                <h3 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                  GPT-6 Astra (max)
                </h3>
              </div>
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
                OpenAI frontier flagship. Maximum general intelligence, autonomous systems design, and multi-step cross-domain problem solving.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-[#444746] dark:text-[#9aa0a6] font-mono">
              Frontier Reasoning • Generalist
            </div>
          </div>

          {/* 4. Grok 4.7 */}
          <div className="card-minimal flex flex-col justify-between p-5 group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#444746] dark:text-[#9aa0a6]">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>xAI</span>
                  <span>·</span>
                  <span>256k Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-semibold text-[#444746] dark:text-[#9aa0a6] px-2 py-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08]">
                  XHIGH
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                  <img
                    src={CURATED_MODEL_MAP['grok-4-7'].iconSrc}
                    alt={CURATED_MODEL_MAP['grok-4-7'].iconAlt}
                    className="w-[18px] h-[18px] object-contain dark:invert"
                  />
                </div>
                <h3 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                  Grok 4.7 (xhigh)
                </h3>
              </div>
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
                xAI's extreme inference engine. Direct real-time insight synthesis, high-throughput multi-agent orchestration, and uncompromising technical clarity.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-[#444746] dark:text-[#9aa0a6] font-mono">
              Extreme Inference • Real-time
            </div>
          </div>

          {/* 5. DeepSeek V4.1 Flash 1017 */}
          <div className="card-minimal flex flex-col justify-between p-5 group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#444746] dark:text-[#9aa0a6]">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>DeepSeek</span>
                  <span>·</span>
                  <span>128k Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-semibold text-[#444746] dark:text-[#9aa0a6] px-2 py-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08]">
                  MAX
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                  <img
                    src={CURATED_MODEL_MAP['deepseek-v4-1-flash'].iconSrc}
                    alt={CURATED_MODEL_MAP['deepseek-v4-1-flash'].iconAlt}
                    className="w-[18px] h-[18px] object-contain"
                  />
                </div>
                <h3 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                  DeepSeek V4.1 Flash
                </h3>
              </div>
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
                Next-gen MoE architecture offering instantaneous response velocity combined with rigorous chain-of-thought mathematical proof verification.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-[#444746] dark:text-[#9aa0a6] font-mono">
              Ultra Dense MoE • Math & Logic
            </div>
          </div>

          {/* 6. Kimi K3.1 Pro */}
          <div className="card-minimal flex flex-col justify-between p-5 group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#444746] dark:text-[#9aa0a6]">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>Moonshot AI</span>
                  <span>·</span>
                  <span>2M Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-semibold text-[#444746] dark:text-[#9aa0a6] px-2 py-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08]">
                  REASONING
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                  <img
                    src={CURATED_MODEL_MAP['kimi-k3-1-pro'].iconSrc}
                    alt={CURATED_MODEL_MAP['kimi-k3-1-pro'].iconAlt}
                    className="w-[18px] h-[18px] object-contain dark:invert"
                  />
                </div>
                <h3 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                  Kimi K3.1 Pro
                </h3>
              </div>
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
                Moonshot flagship with native 2M context handling. Specialized in massive document digests, legal contracts, and academic synthesis.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-[#444746] dark:text-[#9aa0a6] font-mono">
              Document Synthesis • Long Context
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Value & Plan Comparison Calculator */}
      <PricingComparisonSection />

      {/* 3-Row Animated AI Models Marquee (Placed directly below Pricing) */}
      <ModelsMarqueeSection />

      {/* Product Video Walkthrough Section (Autoplays on scroll) */}
      <VideoDemoSection videoId="HkkLswEAv8I" />

      {/* Smarter Workflows • One AI Platform Section */}
      <SmarterWorkflowsSection />

      {/* Interactive Multi-Model Output Showcase */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 space-y-2.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] block">
            Live Comparison
          </span>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
            Inspect Side-by-Side Model Outputs
          </h2>
          <p className="text-sm text-[#444746] dark:text-[#9aa0a6] max-w-lg mx-auto leading-[1.7]">
            Test how different foundation models tackle real coding, Bangla copywriting, and mathematical tasks.
          </p>
        </div>

        {/* Task Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {SAMPLE_BENCHMARKS.map((sample, idx) => (
            <button
              key={sample.id}
              onClick={() => {
                setActiveBenchmarkTab(idx);
                setActiveModelTab(0);
              }}
              className={`min-h-9 h-auto py-2 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer text-center ${
                activeBenchmarkTab === idx
                  ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314]'
                  : 'bg-[#f0f4f9] dark:bg-[#1e1f20] text-[#444746] dark:text-[#9aa0a6] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
              }`}
            >
              {sample.category}
            </button>
          ))}
        </div>

        {/* Interactive Prompt & Model Output Card */}
        <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#1e1f20] p-4 sm:p-6 space-y-5 min-w-0">
          {/* Prompt Header */}
          <div className="space-y-1.5 pb-4 border-b border-black/[0.08] dark:border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] block">
              Prompt Input
            </span>
            <p className="text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] leading-[1.7] break-words">
              "{SAMPLE_BENCHMARKS[activeBenchmarkTab].prompt}"
            </p>
          </div>

          {/* Model Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {SAMPLE_BENCHMARKS[activeBenchmarkTab].models.map((m, mIdx) => (
              <button
                key={mIdx}
                onClick={() => setActiveModelTab(mIdx)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer font-mono text-left ${
                  activeModelTab === mIdx
                    ? 'border-[#1f1f1f] dark:border-[#e3e3e3] bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] font-bold'
                    : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6] hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                {m.modelName}
              </button>
            ))}
          </div>

          {/* Rendered Output Box */}
          <div className="bg-white dark:bg-[#131314] rounded-2xl p-4 sm:p-5 border border-black/[0.08] dark:border-white/[0.08] min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-[11px] text-[#444746] dark:text-[#9aa0a6]">
              <span className="font-mono text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold break-words">
                {SAMPLE_BENCHMARKS[activeBenchmarkTab].models[activeModelTab]?.modelName}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.06] dark:border-white/[0.08] text-[10px] font-mono shrink-0">
                {SAMPLE_BENCHMARKS[activeBenchmarkTab].models[activeModelTab]?.badge}
              </span>
            </div>
            {SAMPLE_BENCHMARKS[activeBenchmarkTab].id === 'coding' ? (
              <CodeIdeHighlight
                code={SAMPLE_BENCHMARKS[activeBenchmarkTab].models[activeModelTab]?.output || ''}
                filename="useDebouncedSearch.ts"
                languageLabel="TypeScript"
              />
            ) : (
              <pre className="text-xs font-sans text-[#1f1f1f] dark:text-[#e3e3e3] whitespace-pre-wrap break-words leading-[1.7] overflow-x-auto max-w-full">
                {SAMPLE_BENCHMARKS[activeBenchmarkTab].models[activeModelTab]?.output}
              </pre>
            )}
          </div>
        </div>
      </section>

      {/* Tailored for Bangladesh Use Cases */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] block">
            Built for Bangladesh
          </span>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
            Engineered for High-Output Professionals
          </h2>
          <p className="text-sm text-[#444746] dark:text-[#9aa0a6] max-w-lg mx-auto leading-[1.7]">
            From local startups to top-rated marketplace freelancers, see how Bangla AI transforms everyday productivity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-minimal p-5 space-y-3">
            <div className="w-9 h-9 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3]">
              <Laptop className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">Software Engineers</h3>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
              Debug complex TypeScript code, architect distributed databases, and generate unit test suites with Claude Fable 5.2 and GPT-6 Astra.
            </p>
          </div>

          <div className="card-minimal p-5 space-y-3">
            <div className="w-9 h-9 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3]">
              <Megaphone className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">Digital Marketers</h3>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
              Produce high-converting Facebook & TikTok ad copy in fluent conversational Bengali and English, hook scripts, and SEO blogs.
            </p>
          </div>

          <div className="card-minimal p-5 space-y-3">
            <div className="w-9 h-9 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3]">
              <Briefcase className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">Freelancers & Agencies</h3>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
              Deliver client deliverables on Upwork and Fiverr 5x faster. Create proposals, analyze RFPs, and draft technical documentation.
            </p>
          </div>

          <div className="card-minimal p-5 space-y-3">
            <div className="w-9 h-9 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3]">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">Students & Researchers</h3>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
              Summarize extensive academic papers, format LaTeX equations, and verify mathematical theorems with Kimi K3.1 and DeepSeek.
            </p>
          </div>
        </div>
      </section>

      {/* Categorized Two-Column Interactive FAQ Section */}
      <FaqSection />
    </div>
  );
};
