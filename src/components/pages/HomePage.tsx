import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Sparkles,
  Code2,
  Cpu,
  Zap,
  Globe2,
  FileCheck2,
  Layers,
  TrendingUp,
  Lock,
  ChevronDown,
  ChevronUp,
  Laptop,
  Briefcase,
  GraduationCap,
  Megaphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { PLANS, formatBDT } from '../../utils/billing.ts';

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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="space-y-24 sm:space-y-32 py-12 sm:py-20 animate-in fade-in transition-colors bg-white dark:bg-[#0A0A0A] text-black dark:text-white">
      {/* Hero Region (OpenAI Minimal Spacious Center) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 text-xs font-medium text-gray-700 dark:text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Bangla AI • All 10 Frontier AI Models in One Hub</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.12] text-black dark:text-white max-w-3xl mx-auto">
            Every top AI model.
            <span className="block font-medium text-gray-500 dark:text-gray-400 mt-1">
              One sparse, high-clarity interface.
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
                document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-pill-secondary w-full sm:w-auto h-11 px-7 text-sm cursor-pointer"
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
              <p className="text-2xl font-bold tracking-tight text-black dark:text-white">Zero Cards</p>
              <p className="text-xs text-gray-500 mt-1">No dual currency passport hassle</p>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-black dark:text-white">99.9%</p>
              <p className="text-xs text-gray-500 mt-1">High-throughput uptime</p>
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

        <div className="overflow-hidden rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0C0C0C] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F9] dark:bg-[#141414] border-b border-black/[0.08] dark:border-white/[0.08] font-mono text-[11px] text-gray-500">
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
                    ৳1,299 / mo (Save 87%)
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
          {/* Claude Fable 5.2 */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors">
            <div className="space-y-2.5">
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
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Coding Specialist • Literary Precision
            </div>
          </div>

          {/* Gemini 4 Carbon */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors">
            <div className="space-y-2.5">
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
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              2M Context • Low Latency Multimodal
            </div>
          </div>

          {/* GPT-6 Astra */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors">
            <div className="space-y-2.5">
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
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Frontier Reasoning • Generalist
            </div>
          </div>

          {/* Grok 4.7 */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors">
            <div className="space-y-2.5">
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
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Extreme Inference • Real-time
            </div>
          </div>

          {/* DeepSeek V4.1 Flash 1017 */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors">
            <div className="space-y-2.5">
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
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Ultra Dense MoE • Math & Logic
            </div>
          </div>

          {/* Kimi K3.1 Pro */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors">
            <div className="space-y-2.5">
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
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Document Synthesis • Long Context
            </div>
          </div>

          {/* Gemini 2.5 Flash */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Google</span>
                <span>·</span>
                <span>1M Context</span>
                <span>·</span>
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-600">BALANCED</span>
              </div>
              <h3 className="text-base font-semibold text-black dark:text-white">Gemini 2.5 Flash</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Ultra-fast versatile workhorse designed for high-frequency queries, instant summarization, and rapid draft iterations.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Sub-second Latency • Efficient
            </div>
          </div>

          {/* Gemini 2.5 Pro */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Google</span>
                <span>·</span>
                <span>2M Context</span>
                <span>·</span>
                <span className="font-mono text-[10px] uppercase font-bold text-black dark:text-white">PRO</span>
              </div>
              <h3 className="text-base font-semibold text-black dark:text-white">Gemini 2.5 Pro</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Deep analytical reasoning model optimized for cross-modal datasets, video timestamps, and multi-file codebases.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Complex Analysis • Deep Reasoning
            </div>
          </div>

          {/* GPT-4o & Claude 3.5 Sonnet */}
          <div className="card-minimal flex flex-col justify-between p-5 hover:border-black/30 dark:hover:border-white/30 transition-colors">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>OpenAI / Anthropic</span>
                <span>·</span>
                <span>Industry Standards</span>
              </div>
              <h3 className="text-base font-semibold text-black dark:text-white">GPT-4o & Claude 3.5 Sonnet</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Proven industry workhorses for software development, technical writing, and production conversational logic.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 font-mono">
              Industry Benchmarks • Reliable
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
            Limited-time special launch discount on all plans. Activate instantly with bKash, Nagad, or Rocket.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Monthly Plan */}
          <div className="card-minimal p-7 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-black dark:text-white">Monthly Plan</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                  15% OFF
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Ideal for individuals getting started with AI</p>

              <div className="mt-6 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 line-through">
                    ৳1,529
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    Save ৳230/mo
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold text-black dark:text-white font-mono">
                    {formatBDT(PLANS.monthly.priceBDT)}
                  </span>
                  <span className="text-xs text-gray-500">/ month</span>
                </div>
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
                className="btn-pill-secondary w-full text-center cursor-pointer"
              >
                Claim 15% Off • Subscribe (৳1,299)
              </button>
            </div>
          </div>

          {/* Yearly Plan (Emphasis Card) */}
          <div className="card-minimal p-7 flex flex-col justify-between border-black/20 dark:border-white/25 shadow-sm relative">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-black dark:text-white">Yearly Plan</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                  36% OFF • BEST VALUE
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Best value for power users and professionals</p>

              <div className="mt-6 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 line-through">
                    ৳15,588
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    Save ৳5,589/yr
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold text-black dark:text-white font-mono">
                    {formatBDT(PLANS.yearly.priceBDT)}
                  </span>
                  <span className="text-xs text-gray-500">/ year</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">
                  Equivalent to ৳833/month
                </p>
              </div>

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
                className="btn-pill-primary w-full text-center cursor-pointer"
              >
                Claim 36% Off • Subscribe (৳9,999)
              </button>
            </div>
          </div>
        </div>
      </section>

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
        <div className="flex items-center justify-center gap-2 mb-6 overflow-x-auto pb-2">
          {SAMPLE_BENCHMARKS.map((sample, idx) => (
            <button
              key={sample.id}
              onClick={() => {
                setActiveBenchmarkTab(idx);
                setActiveModelTab(0);
              }}
              className={`h-9 px-4 rounded-full text-xs font-semibold transition-all cursor-pointer ${
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
        <div className="rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0C0C0C] p-6 shadow-xs space-y-5">
          {/* Prompt Header */}
          <div className="space-y-1.5 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">
              Prompt Input
            </span>
            <p className="text-sm font-medium text-black dark:text-white">
              "{SAMPLE_BENCHMARKS[activeBenchmarkTab].prompt}"
            </p>
          </div>

          {/* Model Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {SAMPLE_BENCHMARKS[activeBenchmarkTab].models.map((m, mIdx) => (
              <button
                key={mIdx}
                onClick={() => setActiveModelTab(mIdx)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-all cursor-pointer font-mono ${
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
          <div className="bg-[#F8F9FA] dark:bg-[#141414] rounded-[8px] p-4 border border-black/[0.05] dark:border-white/[0.05]">
            <div className="flex items-center justify-between mb-3 text-[11px] text-gray-500">
              <span className="font-mono text-black dark:text-white font-semibold">
                {SAMPLE_BENCHMARKS[activeBenchmarkTab].models[activeModelTab]?.modelName}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[10px] font-mono">
                {SAMPLE_BENCHMARKS[activeBenchmarkTab].models[activeModelTab]?.badge}
              </span>
            </div>
            <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {SAMPLE_BENCHMARKS[activeBenchmarkTab].models[activeModelTab]?.output}
            </pre>
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

      {/* 4-Step Payment Verification Process */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block">
            MFS Verification
          </span>
          <h2 className="text-2xl font-medium tracking-tight text-black dark:text-white">
            How Payment Verification Works
          </h2>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            100% transparent and verified. No automatic recurring card deductions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-minimal p-4 space-y-2">
            <span className="text-xs font-mono font-bold text-gray-400">01</span>
            <h4 className="font-bold text-xs text-black dark:text-white">Choose Your Plan</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Select Monthly (৳1,299) or Yearly (৳9,999) and click Subscribe.
            </p>
          </div>

          <div className="card-minimal p-4 space-y-2">
            <span className="text-xs font-mono font-bold text-gray-400">02</span>
            <h4 className="font-bold text-xs text-black dark:text-white">Send MFS Money</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Use your personal bKash, Nagad, or Rocket app to send payment to our official merchant/personal number.
            </p>
          </div>

          <div className="card-minimal p-4 space-y-2">
            <span className="text-xs font-mono font-bold text-gray-400">03</span>
            <h4 className="font-bold text-xs text-black dark:text-white">Submit TrxID</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Enter your sender phone number and the SMS Transaction ID (e.g. 9B4F8X12) in checkout.
            </p>
          </div>

          <div className="card-minimal p-4 space-y-2">
            <span className="text-xs font-mono font-bold text-gray-400">04</span>
            <h4 className="font-bold text-xs text-black dark:text-white">Admin Approval</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Our admin team checks the TrxID with MFS logs, approves the payment, and unlocks your account immediately.
            </p>
          </div>
        </div>
      </section>

      {/* Enterprise Security & Privacy */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="card-minimal p-7 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-black dark:text-white">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black dark:text-white">Data Privacy & Zero-Retention Security</h3>
              <p className="text-xs text-gray-500">Your proprietary code and prompts are private to you</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-black dark:text-white block">TLS 1.3 Encryption</span>
              <p className="text-gray-500 leading-relaxed text-[11px]">
                All prompts, responses, and token streams travel across bank-grade encrypted channels.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-black dark:text-white block">Zero Public Training</span>
              <p className="text-gray-500 leading-relaxed text-[11px]">
                User prompts and generated artifacts are strictly never fed into public AI training datasets.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-black dark:text-white block">Bangladesh Data Integrity</span>
              <p className="text-gray-500 leading-relaxed text-[11px]">
                Transparent local records with verified bKash, Nagad, and Rocket receipts for easy accounting.
              </p>
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

      {/* FAQ Accordion */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block">
            Got Questions?
          </span>
          <h2 className="text-xl sm:text-2xl font-medium text-black dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          {[
            {
              q: 'Can I switch between Gemini 4 Carbon, GPT-6 Astra, and Claude Fable 5.2 in the same chat?',
              a: 'Yes! You can switch foundation models on the fly using the model selector at the top of the chat interface. Your conversation context is maintained across models.'
            },
            {
              q: 'How does payment verification work with bKash, Nagad, and Rocket?',
              a: 'When you select a plan, you will see our official payment number. Send the exact plan amount (৳1,299 or ৳9,999) using your MFS app, then copy the Transaction ID (TrxID) received via SMS into the form along with your sender number. Our admin panel verifies the TrxID with MFS records and activates your subscription immediately.'
            },
            {
              q: 'Do I need an international credit card or passport endorsement?',
              a: 'No. Bangla AI was built specifically to solve the payment roadblock in Bangladesh. You do not need any dual currency card or passport endorsement. Standard bKash, Nagad, or Rocket accounts are 100% sufficient.'
            },
            {
              q: 'What is the token quota and what happens if I reach the limit?',
              a: 'Monthly subscriptions provide 50,000 tokens (enough for thousands of questions, code analyses, and translations). Yearly subscribers receive 600,000 tokens. You can track your token consumption in real-time on your Account page and renew or top up whenever needed.'
            },
            {
              q: 'Can I use Bangla AI for team or commercial software projects?',
              a: 'Absolutely. All code and content generated on Bangla AI belongs 100% to you and is free for commercial use in client deliverables, software products, and advertising campaigns.'
            }
          ].map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="card-minimal p-4 transition-colors cursor-pointer"
                onClick={() => toggleFaq(idx)}
              >
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-black dark:text-white text-xs sm:text-sm">
                    {faq.q}
                  </h4>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                </div>
                {isOpen && (
                  <p className="text-gray-600 dark:text-gray-400 mt-2.5 leading-relaxed text-xs border-t border-black/[0.06] dark:border-white/[0.06] pt-2.5">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
