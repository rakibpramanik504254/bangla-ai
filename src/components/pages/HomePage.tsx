import React, { useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
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
    <div className="space-y-20 sm:space-y-32 py-10 sm:py-20 overflow-x-clip animate-in fade-in transition-colors bg-white dark:bg-[#1F1F1F] text-black dark:text-white">
      {/* Hero Region (OpenAI Minimal Spacious Center) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="space-y-6">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 max-w-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>Bangla AI • All 10 Frontier AI Models in One Hub</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.12] text-black dark:text-white max-w-3xl mx-auto">
            Every top AI model.
            <span className="block font-medium text-gray-500 dark:text-gray-400 mt-1">
              One clean, simple interface.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-normal">
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
              className="btn-pill-primary w-full sm:w-auto h-11 px-7 text-sm cursor-pointer shadow-sm"
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

          {/* Key Metrics Strip (Clean Typography, No Pill Enclosures) */}
          <div className="pt-10 sm:pt-12 mt-6 border-t border-black/[0.06] dark:border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white">10+ Models</p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-1">Claude Fable, Gemini 4, GPT-6, Grok</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white">Direct MFS</p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-1">bKash, Nagad & Rocket verification</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white">Zero Cards</p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-1">No dual currency passport hassle</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white">99.9%</p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-1">High-throughput uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section: "Why Bangla AI vs Individual Subscriptions" */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block">
            Cost & Value Comparison
          </span>
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-black dark:text-white">
            Why Bangla AI vs Buying Individual Plans
          </h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            Purchasing ChatGPT Plus, Claude Pro, and Grok separately costs over $80/month (~৳10,000 BDT) and requires an endorsed international credit card. Bangla AI unites them into a single subscription.
          </p>
        </div>

        <div className="overflow-hidden rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#262626] shadow-xs">
          {/* Mobile Stacked Comparison Cards (Zero horizontal table scroll) */}
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
                <p className="font-bold text-black dark:text-white">{row.label}</p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="p-2.5 rounded-[6px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-0.5">
                      Separate Plans
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 leading-snug block">{row.separate}</span>
                  </div>
                  <div className="p-2.5 rounded-[6px] bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08] border border-emerald-500/20">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
                      Bangla AI (Unified)
                    </span>
                    <span className={`leading-snug block ${row.highlight ? 'font-bold font-mono text-emerald-600 dark:text-emerald-400' : 'font-semibold text-black dark:text-white'}`}>
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
              <thead className="bg-[#F9F9F9] dark:bg-[#2D2D2D] border-b border-black/[0.08] dark:border-white/[0.08] font-mono text-[11px] text-gray-500">
                <tr>
                  <th className="py-4 px-5 font-semibold">Features & Capabilities</th>
                  <th className="py-4 px-5 font-semibold text-gray-400">Separate AI Subscriptions</th>
                  <th className="py-4 px-5 font-bold text-black dark:text-white bg-black/[0.02] dark:bg-white/[0.03]">
                    Bangla AI (Unified)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                <tr className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                  <td className="py-3.5 px-5 font-medium text-black dark:text-white">Monthly Subscription Cost</td>
                  <td className="py-3.5 px-5 text-gray-500 font-mono">$80+ / mo (~৳10,000+ BDT)</td>
                  <td className="py-3.5 px-5 font-bold text-emerald-600 dark:text-emerald-400 font-mono bg-black/[0.02] dark:bg-white/[0.03]">
                    ৳699 / mo (Save 93%)
                  </td>
                </tr>
                <tr className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                  <td className="py-3.5 px-5 font-medium text-black dark:text-white">Payment Method in Bangladesh</td>
                  <td className="py-3.5 px-5 text-gray-500">Passport-endorsed Dual Currency Credit Card required</td>
                  <td className="py-3.5 px-5 font-semibold text-black dark:text-white bg-black/[0.02] dark:bg-white/[0.03]">
                    bKash, Nagad, Rocket (TrxID)
                  </td>
                </tr>
                <tr className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                  <td className="py-3.5 px-5 font-medium text-black dark:text-white">Catalog of Top Foundation Models</td>
                  <td className="py-3.5 px-5 text-gray-500">1 model per subscription tab</td>
                  <td className="py-3.5 px-5 font-semibold text-black dark:text-white bg-black/[0.02] dark:bg-white/[0.03]">
                    10 Flagship Models in 1 Account
                  </td>
                </tr>
                <tr className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                  <td className="py-3.5 px-5 font-medium text-black dark:text-white">Cross-Model Workflow Switcher</td>
                  <td className="py-3.5 px-5 text-gray-500">Manual copy-pasting across different browser tabs</td>
                  <td className="py-3.5 px-5 font-semibold text-black dark:text-white bg-black/[0.02] dark:bg-white/[0.03]">
                    Switch model in-flight with continuous context
                  </td>
                </tr>
                <tr className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                  <td className="py-3.5 px-5 font-medium text-black dark:text-white">Customer Support & Verification</td>
                  <td className="py-3.5 px-5 text-gray-500">Overseas automated chatbot</td>
                  <td className="py-3.5 px-5 font-semibold text-black dark:text-white bg-black/[0.02] dark:bg-white/[0.03]">
                    Dedicated Bangladesh Support Team
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Curated Foundation Models (All 10 Models Displayed Cleanly) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block">
            Engine Fleet
          </span>
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-black dark:text-white">
            10 Curated Foundation Models
          </h2>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            State-of-the-art weights from Anthropic, Google, OpenAI, xAI, DeepSeek, and Moonshot ready for production tasks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Claude Fable 5.2 */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>Anthropic</span>
                  <span>·</span>
                  <span>500k Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  MAX
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <img
                    src={CURATED_MODEL_MAP['claude-fable-5-2'].iconSrc}
                    alt={CURATED_MODEL_MAP['claude-fable-5-2'].iconAlt}
                    className="w-[18px] h-[18px] object-contain"
                  />
                </div>
                <h3 className="text-base font-semibold text-black dark:text-white leading-snug">
                  Claude Fable 5.2 (max)
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Anthropic's pinnacle intelligence. Exceptional software engineering, complex system architecture design, and nuanced prose refinement.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Coding Specialist • Literary Precision
            </div>
          </div>

          {/* 2. Gemini 4 Carbon */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>Google</span>
                  <span>·</span>
                  <span>2M Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                  HIGH
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <img
                    src={CURATED_MODEL_MAP['gemini-4-carbon'].iconSrc}
                    alt={CURATED_MODEL_MAP['gemini-4-carbon'].iconAlt}
                    className="w-[18px] h-[18px] object-contain"
                  />
                </div>
                <h3 className="text-base font-semibold text-black dark:text-white leading-snug">
                  Gemini 4 Carbon (high)
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Next-generation Google Carbon architecture with massive 2M token context, high-throughput multimodal intelligence, and instantaneous response streaming.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              2M Context • Low Latency Multimodal
            </div>
          </div>

          {/* 3. GPT-6 Astra */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>OpenAI</span>
                  <span>·</span>
                  <span>1M Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  MAX
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <img
                    src={CURATED_MODEL_MAP['gpt-6-astra'].iconSrc}
                    alt={CURATED_MODEL_MAP['gpt-6-astra'].iconAlt}
                    className="w-[18px] h-[18px] object-contain dark:invert"
                  />
                </div>
                <h3 className="text-base font-semibold text-black dark:text-white leading-snug">
                  GPT-6 Astra (max)
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                OpenAI frontier flagship. Maximum general intelligence, autonomous systems design, and multi-step cross-domain problem solving.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Frontier Reasoning • Generalist
            </div>
          </div>

          {/* 4. Grok 4.7 */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>xAI</span>
                  <span>·</span>
                  <span>256k Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-bold text-black dark:text-white px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 border border-black/15 dark:border-white/20">
                  XHIGH
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 text-black dark:text-white border border-black/10 dark:border-white/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <img
                    src={CURATED_MODEL_MAP['grok-4-7'].iconSrc}
                    alt={CURATED_MODEL_MAP['grok-4-7'].iconAlt}
                    className="w-[18px] h-[18px] object-contain dark:invert"
                  />
                </div>
                <h3 className="text-base font-semibold text-black dark:text-white leading-snug">
                  Grok 4.7 (xhigh)
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                xAI's extreme inference engine. Direct real-time insight synthesis, high-throughput multi-agent orchestration, and uncompromising technical clarity.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Extreme Inference • Real-time
            </div>
          </div>

          {/* 5. DeepSeek V4.1 Flash 1017 */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>DeepSeek</span>
                  <span>·</span>
                  <span>128k Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                  MAX
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <img
                    src={CURATED_MODEL_MAP['deepseek-v4-1-flash'].iconSrc}
                    alt={CURATED_MODEL_MAP['deepseek-v4-1-flash'].iconAlt}
                    className="w-[18px] h-[18px] object-contain"
                  />
                </div>
                <h3 className="text-base font-semibold text-black dark:text-white leading-snug">
                  DeepSeek V4.1 Flash
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Next-gen MoE architecture offering instantaneous response velocity combined with rigorous chain-of-thought mathematical proof verification.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Ultra Dense MoE • Math & Logic
            </div>
          </div>

          {/* 6. Kimi K3.1 Pro */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>Moonshot AI</span>
                  <span>·</span>
                  <span>2M Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                  REASONING
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <img
                    src={CURATED_MODEL_MAP['kimi-k3-1-pro'].iconSrc}
                    alt={CURATED_MODEL_MAP['kimi-k3-1-pro'].iconAlt}
                    className="w-[18px] h-[18px] object-contain dark:invert"
                  />
                </div>
                <h3 className="text-base font-semibold text-black dark:text-white leading-snug">
                  Kimi K3.1 Pro
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Moonshot flagship with native 2M context handling. Specialized in massive document digests, legal contracts, and academic synthesis.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Document Synthesis • Long Context
            </div>
          </div>

          {/* 7. Gemini 2.5 Flash */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>Google</span>
                  <span>·</span>
                  <span>1M Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  BALANCED
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <img
                    src={CURATED_MODEL_MAP['gemini-2-5-flash'].iconSrc}
                    alt={CURATED_MODEL_MAP['gemini-2-5-flash'].iconAlt}
                    className="w-[18px] h-[18px] object-contain"
                  />
                </div>
                <h3 className="text-base font-semibold text-black dark:text-white leading-snug">
                  Gemini 2.5 Flash
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Ultra-fast versatile workhorse designed for high-frequency queries, instant summarization, and rapid draft iterations.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Sub-second Latency • Efficient
            </div>
          </div>

          {/* 8. Gemini 2.5 Pro */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>Google</span>
                  <span>·</span>
                  <span>2M Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                  PRO
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <img
                    src={CURATED_MODEL_MAP['gemini-2-5-pro'].iconSrc}
                    alt={CURATED_MODEL_MAP['gemini-2-5-pro'].iconAlt}
                    className="w-[18px] h-[18px] object-contain"
                  />
                </div>
                <h3 className="text-base font-semibold text-black dark:text-white leading-snug">
                  Gemini 2.5 Pro
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Deep analytical reasoning model optimized for cross-modal datasets, video timestamps, and multi-file codebases.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Complex Analysis • Deep Reasoning
            </div>
          </div>

          {/* 9. OpenAI GPT-4o */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>OpenAI</span>
                  <span>·</span>
                  <span>128k Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  OMNI
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <img
                    src={CURATED_MODEL_MAP['openai-gpt-4o'].iconSrc}
                    alt={CURATED_MODEL_MAP['openai-gpt-4o'].iconAlt}
                    className="w-[18px] h-[18px] object-contain dark:invert"
                  />
                </div>
                <h3 className="text-base font-semibold text-black dark:text-white leading-snug">
                  OpenAI GPT-4o
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Flagship multimodal intelligence. Excels at nuanced reasoning, creative writing, vision synthesis, and production conversational logic.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Industry Standard • Multimodal
            </div>
          </div>

          {/* 10. Claude 3.5 Sonnet */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>Anthropic</span>
                  <span>·</span>
                  <span>200k Context</span>
                </div>
                <span className="font-mono text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  CODING
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <img
                    src={CURATED_MODEL_MAP['claude-3-5-sonnet'].iconSrc}
                    alt={CURATED_MODEL_MAP['claude-3-5-sonnet'].iconAlt}
                    className="w-[18px] h-[18px] object-contain"
                  />
                </div>
                <h3 className="text-base font-semibold text-black dark:text-white leading-snug">
                  Claude 3.5 Sonnet
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Industry-leading software engineering and prose refinement. Unmatched code generation, debugging, and architecture review.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Engineering Benchmark • Nuance
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
        <div className="text-center mb-8 space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block">
            Live Comparison
          </span>
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-black dark:text-white">
            Inspect Side-by-Side Model Outputs
          </h2>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
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
              className={`min-h-9 h-auto py-2 px-3.5 sm:px-4 rounded-full text-xs font-semibold transition-all cursor-pointer text-center ${
                activeBenchmarkTab === idx
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {sample.category}
            </button>
          ))}
        </div>

        {/* Interactive Prompt & Model Output Card */}
        <div className="rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#262626] p-4 sm:p-6 shadow-xs space-y-5 min-w-0">
          {/* Prompt Header */}
          <div className="space-y-1.5 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">
              Prompt Input
            </span>
            <p className="text-sm font-medium text-black dark:text-white break-words">
              "{SAMPLE_BENCHMARKS[activeBenchmarkTab].prompt}"
            </p>
          </div>

          {/* Model Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {SAMPLE_BENCHMARKS[activeBenchmarkTab].models.map((m, mIdx) => (
              <button
                key={mIdx}
                onClick={() => setActiveModelTab(mIdx)}
                className={`text-xs px-3 sm:px-3.5 py-1.5 rounded-full border transition-all cursor-pointer font-mono text-left ${
                  activeModelTab === mIdx
                    ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold'
                    : 'border-black/10 dark:border-white/10 text-gray-500 hover:border-black/30'
                }`}
              >
                {m.modelName}
              </button>
            ))}
          </div>

          {/* Rendered Output Box */}
          <div className="bg-[#F8F9FA] dark:bg-[#1F1F1F] rounded-[8px] p-3.5 sm:p-4 border border-black/[0.05] dark:border-white/[0.05] min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-[11px] text-gray-500">
              <span className="font-mono text-black dark:text-white font-semibold break-words">
                {SAMPLE_BENCHMARKS[activeBenchmarkTab].models[activeModelTab]?.modelName}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[10px] font-mono shrink-0">
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
              <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed overflow-x-auto max-w-full">
                {SAMPLE_BENCHMARKS[activeBenchmarkTab].models[activeModelTab]?.output}
              </pre>
            )}
          </div>
        </div>
      </section>

      {/* Tailored for Bangladesh Use Cases */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block">
            Built for Bangladesh
          </span>
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-black dark:text-white">
            Engineered for High-Output Professionals
          </h2>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            From local startups to top-rated marketplace freelancers, see how Bangla AI transforms everyday productivity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-minimal p-5 space-y-3">
            <div className="w-9 h-9 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-black dark:text-white">
              <Laptop className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-black dark:text-white">Software Engineers</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Debug complex TypeScript code, architect distributed databases, and generate unit test suites with Claude Fable 5.2 and GPT-6 Astra.
            </p>
          </div>

          <div className="card-minimal p-5 space-y-3">
            <div className="w-9 h-9 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-black dark:text-white">
              <Megaphone className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-black dark:text-white">Digital Marketers</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Produce high-converting Facebook & TikTok ad copy in fluent conversational Bengali and English, hook scripts, and SEO blogs.
            </p>
          </div>

          <div className="card-minimal p-5 space-y-3">
            <div className="w-9 h-9 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-black dark:text-white">
              <Briefcase className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-black dark:text-white">Freelancers & Agencies</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Deliver client deliverables on Upwork and Fiverr 5x faster. Create proposals, analyze RFPs, and draft technical documentation.
            </p>
          </div>

          <div className="card-minimal p-5 space-y-3">
            <div className="w-9 h-9 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-black dark:text-white">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-black dark:text-white">Students & Researchers</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Summarize extensive academic papers, format LaTeX equations, and verify mathematical theorems with Kimi K3.1 and DeepSeek.
            </p>
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

      {/* Categorized Two-Column Interactive FAQ Section */}
      <FaqSection />
    </div>
  );
};
