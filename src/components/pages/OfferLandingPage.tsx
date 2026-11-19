import React, { useState } from 'react';
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSearch,
  FileSpreadsheet,
  Image as ImageIcon,
  Layers,
  Lock,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { BrandLogo } from '../common/BrandLogo.tsx';
import { CURATED_MODEL_MAP } from '../../utils/foundationModels.ts';
import { TUTORIAL_EMBED_URL } from '../../utils/tutorial.ts';

interface OfferLandingPageProps {
  onStartChat: () => void;
}

const FLAGSHIP_MODELS = [
  {
    key: 'gpt-6-astra',
    shortName: 'ChatGPT',
    modelTag: 'GPT-6 Astra · GPT-4o',
    standaloneCost: '৳২,৫০০/মাস',
  },
  {
    key: 'claude-fable-5-2',
    shortName: 'Claude',
    modelTag: 'Claude 5.2 · Sonnet',
    standaloneCost: '৳২,৫০০/মাস',
  },
  {
    key: 'gemini-4-carbon',
    shortName: 'Gemini',
    modelTag: 'Gemini 4 · 2.5 Pro',
    standaloneCost: '৳২,৫০০/মাস',
  },
  {
    key: 'grok-4-7',
    shortName: 'Grok',
    modelTag: 'Grok 4.7 (xhigh)',
    standaloneCost: '৳৩,৫০০/মাস',
  },
  {
    key: 'deepseek-v4-1-flash',
    shortName: 'DeepSeek',
    modelTag: 'DeepSeek V4.1 Flash',
    standaloneCost: '৳১,২০০/মাস',
  },
] as const;

const PAIN_POINTS = [
  {
    title: 'মাসে ১০,০০০+ টাকা খরচ',
    detail:
      'ChatGPT Plus, Claude Pro, Gemini ও Grok আলাদাভাবে কিনতে প্রতি মাসে $৮০+ (১০,০০০ টাকার বেশি) খরচ পড়ে।',
  },
  {
    title: 'পাসপোর্ট এনডোর্স করা ডুয়াল কারেন্সি কার্ডের প্রয়োজন',
    detail:
      'আন্তর্জাতিক ক্রেডিট কার্ড বা ব্যাংক এনডোর্সমেন্ট ছাড়া সরাসরি সাবস্ক্রিপশন নেওয়া যায় না।',
  },
  {
    title: 'শেয়ার্ড অ্যাকাউন্টে প্রাইভেসি রিস্ক ও লিমিট শেষ হওয়ার ভয়',
    detail:
      'কম দামের শেয়ার্ড অ্যাকাউন্টে আপনার ব্যক্তিগত চ্যাট অন্যরা দেখে ফেলে এবং কাজের মাঝপথে লগআউট বা লিমিট শেষ হয়ে যায়।',
  },
  {
    title: 'একাধিক ট্যাব ও আলাদা লগইনের ঝামেলা',
    detail:
      'এক AI থেকে উত্তর নিয়ে আরেক AI-তে কপি-পেস্ট করতে গিয়ে মূল্যবান সময় নষ্ট হয়।',
  },
];

const SOLUTION_POINTS = [
  {
    title: 'মাত্র ৬৯৯ টাকা/মাস (৯৩% সাশ্রয়)',
    detail:
      'আলাদা ১০,০০০+ টাকার বদলে এক সাবস্ক্রিপশনেই সব প্রিমিয়াম AI—বার্ষিক প্ল্যানে মাসে মাত্র ৫০০ টাকা।',
  },
  {
    title: 'সহজ বিকাশ ও নগদ পেমেন্ট',
    detail:
      'কোনো ডলার কার্ড বা পাসপোর্ট লাগবে না। আপনার নিজের বিকাশ বা নগদ নম্বর থেকেই ১ মিনিটে পেমেন্ট করুন।',
  },
  {
    title: '১০০% পার্সোনাল ও প্রাইভেট ওয়ার্কস্পেস',
    detail:
      'সম্পূর্ণ আপনার নিজস্ব অ্যাকাউন্ট। আপনার চ্যাট, ডকুমেন্ট ও প্রম্পট সম্পূর্ণ সুরক্ষিত ও গোপন থাকে।',
  },
  {
    title: '১০টিরও বেশি প্রিমিয়াম মডেল এক জায়গায়',
    detail:
      'ChatGPT, Claude, Gemini, Grok, DeepSeek ও Kimi—একই চ্যাটে এক ক্লিকে মডেল পরিবর্তন করে কাজ করুন।',
  },
];

const MONTHLY_FEATURES = [
  'বিশ্বের সেরা ১০+ প্রিমিয়াম AI মডেল (ChatGPT, Claude, Gemini, Grok, DeepSeek)',
  'প্রতি মাসে ১,০০০,০০০ (1M) হাই-স্পিড টোকেন কোটা',
  'PDF, DOCX ও ইমেজ ফাইল আপলোড ও ডিপ অ্যানালাইসিস',
  'ওয়ান-ক্লিক PDF রিপোর্ট ও PPTX প্রেজেন্টেশন জেনারেটর',
  'AI ইমেজ স্টুডিও ও পার্সিস্টেন্ট চ্যাট মেমোরি',
  '১০০% পার্সোনাল ওয়ার্কস্পেস ও ২৪/৭ বাংলাদেশি সাপোর্ট',
];

const YEARLY_FEATURES = [
  'মাসিক প্ল্যানের সকল প্রিমিয়াম ফিচার সম্পূর্ণ অন্তর্ভুক্ত',
  'বছরে ১৫,০০০,০০০ (15M) বিশাল টোকেন কোটা',
  'প্রতি মাসে খরচ মাত্র ৳৫০০ (বছরে ২,৩৮৯৳ সরাসরি সাশ্রয়)',
  'নতুন রিলিজ হওয়া ফ্ল্যাগশিপ AI মডেলে সবার আগে অ্যাক্সেস',
  'প্রায়োরিটি হাই-স্পিড সার্ভার ও দ্রুততম রেসপন্স স্ট্রিমিং',
  'ডেডিকেটেড ভিআইপি সাপোর্ট — একবার পেমেন্টে পুরো ১ বছর নিশ্চিন্ত',
];

const ACTIVATION_STEPS = [
  {
    step: '০১',
    title: 'প্ল্যান বেছে নিন',
    description:
      'মাসিক (৳৬৯৯) অথবা বেস্ট ভ্যালু বার্ষিক (৳৫,৯৯৯) প্ল্যান সিলেক্ট করে "সাবস্ক্রাইব করুন" বাটনে ক্লিক করুন।',
  },
  {
    step: '০২',
    title: 'বিকাশ বা নগদে Send Money করুন',
    description:
      'চেকআউট স্ক্রিনে দেওয়া অফিসিয়াল বিকাশ বা নগদ নম্বরে নির্ধারিত টাকা পাঠিয়ে SMS থেকে TrxID কপি করুন।',
  },
  {
    step: '০৩',
    title: 'TrxID সাবমিট করে অ্যাক্সেস নিন',
    description:
      'আপনার মোবাইল নম্বর ও TrxID সাবমিট করার সাথে সাথে অ্যাকাউন্ট তৈরি হয়ে যাবে এবং ভেরিফিকেশনের পরপরই প্রো অ্যাক্সেস চালু হবে।',
  },
];

const OFFER_FAQS = [
  {
    question: 'এটি কি শেয়ার্ড অ্যাকাউন্ট?',
    answer:
      'একদমই না! বাংলা-এআই ডট প্রো-তে আপনি পাবেন ১০০% আপনার নিজস্ব পার্সোনাল ও প্রাইভেট ওয়ার্কস্পেস। আপনার চ্যাট হিস্ট্রি, আপলোড করা ফাইল বা প্রম্পট অন্য কেউ দেখতে পারবে না এবং শেয়ার্ড অ্যাকাউন্টের মতো হঠাৎ লগআউট বা অ্যাকাউন্ট ব্যান হওয়ার কোনো ঝুঁকি নেই।',
  },
  {
    question: 'পেমেন্ট করার কতক্ষণ পর অ্যাকাউন্ট চালু হবে?',
    answer:
      'বিকাশ বা নগদে Send Money করে আপনার TrxID সাবমিট করার পর আমাদের ডেডিকেটেড টিম সাধারণত ৫ থেকে ১৫ মিনিটের মধ্যেই ভেরিফাই করে প্রো সাবস্ক্রিপশন অ্যাক্টিভেট করে দেয়। সাবমিট করার সাথে সাথেই আপনার অ্যাকাউন্ট অটো-লগইন হয়ে যাবে।',
  },
  {
    question: 'মোবাইল থেকে ব্যবহার করা যাবে কি?',
    answer:
      'হ্যাঁ, অবশ্যই! বাংলা-এআই ডট প্রো স্মার্টফোন (Android ও iPhone), ট্যাবলেট এবং কম্পিউটার—সব ডিভাইসের জন্য অপটিমাইজড। এমনকি আপনি চাইলে মোবাইল ব্রাউজার থেকে এটি সরাসরি অ্যাপের মতো হোম স্ক্রিনে ইনস্টল করেও ব্যবহার করতে পারবেন।',
  },
  {
    question: 'সাবস্ক্রাইব করতে কি ডলার কার্ড বা আগে থেকে অ্যাকাউন্ট খুলতে হবে?',
    answer:
      'কোনো ডলার কার্ড বা জটিল রেজিস্ট্রেশনের ঝামেলা নেই। আমাদের Express Checkout সিস্টেমে সরাসরি বিকাশ বা নগদে পেমেন্ট করে শুধু আপনার মোবাইল নম্বর ও TrxID দিলেই আপনার অর্ডার কনফার্ম ও অ্যাকাউন্ট তৈরি হয়ে যাবে।',
  },
  {
    question: 'এক সাবস্ক্রিপশনে কোন কোন মডেল পাব এবং প্রতি মাসে কতটুকু ব্যবহার করতে পারব?',
    answer:
      'একটি সাবস্ক্রিপশনেই পাচ্ছেন ChatGPT (GPT-6 Astra ও GPT-4o), Claude (Fable 5.2 ও Sonnet), Gemini (4 Carbon ও 2.5 Pro), Grok 4.7, DeepSeek V4.1 এবং Kimi K3.1 সহ ১০টিরও বেশি প্রিমিয়াম মডেল। মাসিক প্ল্যানে ১,০০০,০০০ (1M) এবং বার্ষিক প্ল্যানে ১৫,০০০,০০০ (15M) টোকেন কোটা পাবেন।',
  },
];

export const OfferLandingPage: React.FC<OfferLandingPageProps> = ({ onStartChat }) => {
  const { user, openCheckout, openTutorialModal } = useAuth();
  const isSubscribed = Boolean(user?.isSubscribed || user?.role === 'admin');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [inlineVideoPlaying, setInlineVideoPlaying] = useState(false);

  const handleSubscribe = (plan: 'monthly' | 'yearly' = 'monthly') => {
    if (isSubscribed) {
      onStartChat();
      return;
    }
    openCheckout(plan);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToPricing = () => {
    document.getElementById('offer-pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      lang="bn"
      data-testid="offer-landing-page"
      className="min-h-screen w-full bg-white dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] transition-colors [font-family:'Hind_Siliguri','Plus_Jakarta_Sans',sans-serif] pb-24 sm:pb-12"
    >
      {/* Distraction-Free Header: Logo + Single Primary CTA Only */}
      <header
        data-testid="offer-header"
        className="sm:sticky sm:top-0 z-40 w-full border-b border-black/[0.08] dark:border-white/[0.08] bg-white/90 dark:bg-[#131314]/90 backdrop-blur-md transition-colors"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-2 text-left rounded-lg whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f] dark:focus-visible:outline-[#e3e3e3]"
          >
            <BrandLogo className="w-7 h-7 shrink-0" />
            <span className="text-[15px] sm:text-base font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] [font-family:'Plus_Jakarta_Sans','Hind_Siliguri',sans-serif]">
              Bangla AI
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSubscribe('monthly')}
            data-testid="offer-header-cta"
            className="btn-pill-primary !min-h-10 !h-10 !py-0 !px-4 sm:!px-5 !text-xs sm:!text-sm !whitespace-nowrap shrink-0"
          >
            <span>{isSubscribed ? 'ওয়ার্কস্পেসে যান' : 'সাবস্ক্রাইব করুন'}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="space-y-16 sm:space-y-24 pt-7 sm:pt-12 lg:pt-14">
        {/* 1. HERO SECTION (Above the Fold) */}
        <section
          aria-label="প্রমোশনাল অফার"
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Copy & Conversion CTAs */}
            <div className="lg:col-span-7 space-y-5 text-left">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-[13px] font-medium text-[#444746] dark:text-[#9aa0a6]">
                <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Bangla-AI.pro
                </span>
                <span aria-hidden="true">·</span>
                <span>১০+ প্রিমিয়াম AI মডেল</span>
                <span aria-hidden="true">·</span>
                <span>বিকাশ ও নগদে সহজ পেমেন্ট</span>
              </div>

              <h1 className="text-[28px] sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.26] text-[#1f1f1f] dark:text-[#e3e3e3] text-balance">
                ডলার কার্ড বা শেয়ার্ড অ্যাকাউন্টের ঝামেলা ছাড়াই, বিকাশ-নগদে ব্যবহার করুন বিশ্বের সেরা ১০+ প্রিমিয়াম AI!
              </h1>

              <p className="text-base sm:text-lg text-[#444746] dark:text-[#9aa0a6] leading-[1.75] max-w-2xl">
                আলাদাভাবে কিনতে গেলে মাসে খরচ{' '}
                <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] line-through decoration-red-500/70 tabular-nums">
                  ১০,০০০+ টাকা
                </span>
                , কিন্তু বাংলা-এআই ডট প্রো-তে পাচ্ছেন সব একসাথে মাত্র{' '}
                <strong className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  ৬৯৯ টাকায়!
                </strong>
              </p>

              {/* Primary + Secondary CTAs */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSubscribe('monthly')}
                  data-testid="offer-hero-primary-cta"
                  className="btn-pill-primary !min-h-[48px] sm:!h-12 !px-7 !text-sm sm:!text-[15px] !font-semibold !whitespace-nowrap shrink-0"
                >
                  <span>{isSubscribed ? 'AI ওয়ার্কস্পেস ওপেন করুন' : 'আজই সাবস্ক্রাইব করুন'}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={openTutorialModal}
                  data-testid="offer-hero-video-cta"
                  className="btn-pill-secondary !min-h-[48px] sm:!h-12 !px-6 !text-sm !font-medium !whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" aria-hidden="true" />
                  <span>কীভাবে কিনবেন? ভিডিও দেখুন</span>
                </button>
              </div>

              {/* Clean Unboxed Trust Metadata Strip */}
              <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.08] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-[13px] text-[#444746] dark:text-[#9aa0a6]">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                    aria-hidden="true"
                  />
                  <span>১০০% পার্সোনাল ও প্রাইভেট অ্যাকাউন্ট</span>
                </span>
                <span aria-hidden="true" className="hidden sm:inline text-black/20 dark:text-white/20">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Zap
                    className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0"
                    aria-hidden="true"
                  />
                  <span>TrxID দিয়ে দ্রুত অ্যাক্টিভেশন</span>
                </span>
                <span aria-hidden="true" className="hidden sm:inline text-black/20 dark:text-white/20">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Smartphone
                    className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0"
                    aria-hidden="true"
                  />
                  <span>মোবাইল ও পিসি দুটোতেই স্মুথ</span>
                </span>
              </div>
            </div>

            {/* Right 1:1 Square Visual/Media Container (Playable Promo Video + Flagship Model Showcase) */}
            <div className="lg:col-span-5 w-full max-w-[460px] mx-auto lg:max-w-none">
              <div className="rounded-3xl p-2.5 sm:p-3 bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08]">
                <div
                  data-testid="offer-hero-square-media"
                  className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between"
                >
                  {inlineVideoPlaying ? (
                    <>
                      <iframe
                        src={TUTORIAL_EMBED_URL}
                        title="Bangla AI Promo Video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        className="w-full h-full border-0 block"
                      />
                      <button
                        type="button"
                        onClick={() => setInlineVideoPlaying(false)}
                        aria-label="Close inline promo video"
                        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/70 text-white hover:bg-black flex items-center justify-center backdrop-blur-sm transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="h-full p-4 sm:p-5 flex flex-col justify-between gap-3">
                      {/* Top Header Inside 1:1 Card */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
                        <div className="flex items-center gap-2 min-w-0">
                          <BrandLogo className="w-6 h-6 shrink-0" />
                          <span className="text-xs sm:text-[13px] font-bold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                            সব প্রিমিয়াম AI এক ওয়ার্কস্পেসে
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                          ৳৬৯৯/মাস
                        </span>
                      </div>

                      {/* Interactive 1:1 Promo Video Launch Box */}
                      <button
                        type="button"
                        onClick={() => setInlineVideoPlaying(true)}
                        data-testid="offer-inline-video-play"
                        className="group relative flex-1 min-h-[120px] rounded-xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 p-4 flex flex-col items-center justify-center text-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-150">
                          <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs sm:text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                            ১ মিনিটের ডেমো ও পেমেন্ট গাইড দেখুন
                          </p>
                          <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                            ক্লিক করে সরাসরি এখানেই ভিডিও প্লে করুন
                          </p>
                        </div>
                      </button>

                      {/* Supported AI Models Showcase Grid (ChatGPT, Claude, Gemini, Grok, DeepSeek) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                          <span className="font-medium">অন্তর্ভুক্ত ফ্ল্যাগশিপ মডেলসমূহ</span>
                          <span className="font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold">
                            ১০+ মডেল
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                          {FLAGSHIP_MODELS.map((item) => {
                            const modelAsset = CURATED_MODEL_MAP[item.key];
                            return (
                              <div
                                key={item.key}
                                className="rounded-xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.06] dark:border-white/[0.08] py-2 px-1 flex flex-col items-center justify-center gap-1.5 text-center"
                              >
                                <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                                  {modelAsset && (
                                    <img
                                      src={modelAsset.iconSrc}
                                      alt={modelAsset.iconAlt}
                                      className={`w-4 h-4 object-contain ${
                                        modelAsset.invertDark ? 'dark:invert' : ''
                                      }`}
                                    />
                                  )}
                                </div>
                                <span className="text-[10px] sm:text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] leading-none truncate max-w-full [font-family:'Plus_Jakarta_Sans',sans-serif]">
                                  {item.shortName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. PAIN POINT VS. SOLUTION COMPARISON */}
        <section
          aria-label="আগের ঝামেলা বনাম বাংলা এআই সমাধান"
          className="max-w-5xl mx-auto px-4 sm:px-6"
        >
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-2.5">
            <p className="text-xs font-medium text-[#444746] dark:text-[#9aa0a6]">
              তুলনামূলক বিশ্লেষণ · কেন বাংলা-এআই ডট প্রো সেরা
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-[1.28] text-[#1f1f1f] dark:text-[#e3e3e3] text-balance">
              আলাদা সাবস্ক্রিপশন ও শেয়ার্ড অ্যাকাউন্টের ঝামেলা থেকে চিরতরে মুক্তি
            </h2>
          </div>

          <div className="rounded-3xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-stretch">
              {/* Left Column: আগের ঝামেলা */}
              <div className="rounded-2xl bg-white/85 dark:bg-[#131314]/85 border border-black/[0.08] dark:border-white/[0.08] p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <h3 className="text-base sm:text-lg font-bold">আগের ঝামেলা</h3>
                    </div>
                    <span className="text-xs font-mono font-semibold text-red-600 dark:text-red-400 tabular-nums">
                      ৳১০,০০০+ /মাস
                    </span>
                  </div>

                  <ul className="mt-5 space-y-4">
                    {PAIN_POINTS.map((point) => (
                      <li key={point.title} className="flex items-start gap-3">
                        <XCircle
                          className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-1"
                          aria-hidden="true"
                        />
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                            {point.title}
                          </p>
                          <p className="text-xs sm:text-[13px] text-[#444746] dark:text-[#9aa0a6] leading-[1.65]">
                            {point.detail}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-3.5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs text-[#444746] dark:text-[#9aa0a6]">
                  <span>প্রতি মাসে অতিরিক্ত খরচ ও ঝুঁকি</span>
                  <span className="font-mono font-semibold text-red-600 dark:text-red-400 tabular-nums">
                    $৮০+ / মাস
                  </span>
                </div>
              </div>

              {/* Right Column: Bangla AI সমাধান */}
              <div className="rounded-2xl bg-white dark:bg-[#131314] border-2 border-[#1f1f1f] dark:border-[#e3e3e3] p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 pb-4 border-b border-black/[0.08] dark:border-white/[0.08]">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <h3 className="text-base sm:text-lg font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                        Bangla AI সমাধান
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      মাত্র ৳৬৯৯ /মাস
                    </span>
                  </div>

                  <ul className="mt-5 space-y-4">
                    {SOLUTION_POINTS.map((point) => (
                      <li key={point.title} className="flex items-start gap-3">
                        <CheckCircle2
                          className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1"
                          aria-hidden="true"
                        />
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                            {point.title}
                          </p>
                          <p className="text-xs sm:text-[13px] text-[#444746] dark:text-[#9aa0a6] leading-[1.65]">
                            {point.detail}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-3.5 border-t border-black/[0.08] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    মাসে সাশ্রয় করুন ৯,৩০০+ টাকা (৯৩% কম খরচ)
                  </span>
                  <button
                    type="button"
                    onClick={scrollToPricing}
                    className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] hover:underline inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <span>প্ল্যান দেখুন</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. WORKSPACE PRO FEATURES SHOWCASE (Asymmetric Bento Grid) */}
        <section
          aria-label="ওয়ার্কস্পেস প্রো ফিচারসমূহ"
          className="max-w-5xl mx-auto px-4 sm:px-6"
        >
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-2.5">
            <p className="text-xs font-medium text-[#444746] dark:text-[#9aa0a6]">
              আপগ্রেডেড প্রো ওয়ার্কস্পেস · ফ্রিল্যান্সার, শিক্ষার্থী ও উদ্যোক্তাদের জন্য
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-[1.28] text-[#1f1f1f] dark:text-[#e3e3e3] text-balance">
              একটি সাবস্ক্রিপশনেই পাচ্ছেন আধুনিক প্রো ওয়ার্কস্পেসের সব সুবিধা
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Feature 1 (Wide): Multi-Model Chat */}
            <div className="card-minimal md:col-span-3 p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3]">
                  <Layers className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                  মাল্টি-মডেল চ্যাট (GPT, Claude, Gemini, Grok, DeepSeek)
                </h3>
                <p className="text-xs sm:text-sm text-[#444746] dark:text-[#9aa0a6] leading-[1.75]">
                  কোডিংয়ের জন্য Claude, রিসার্চের জন্য Gemini, মার্কেটিং ও বাংলা কপিরাইটিংয়ের জন্য GPT—একই চ্যাটের ভেতর যেকোনো মুহূর্তে মডেল পরিবর্তন করুন কনটেক্সট না হারিয়েই।
                </p>
              </div>
              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2 flex-wrap">
                {FLAGSHIP_MODELS.map((m) => {
                  const asset = CURATED_MODEL_MAP[m.key];
                  return (
                    <span
                      key={m.key}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#444746] dark:text-[#c4c7c5] bg-[#f0f4f9] dark:bg-[#282a2c] px-2.5 py-1 rounded-lg"
                    >
                      {asset && (
                        <img
                          src={asset.iconSrc}
                          alt={asset.iconAlt}
                          className={`w-3.5 h-3.5 object-contain ${
                            asset.invertDark ? 'dark:invert' : ''
                          }`}
                        />
                      )}
                      <span className="[font-family:'Plus_Jakarta_Sans',sans-serif]">
                        {m.shortName}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Feature 2 (Wide): PDF/DOCX/Image File Analysis */}
            <div className="card-minimal md:col-span-3 p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3]">
                  <FileSearch className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                  PDF, DOCX ও ইমেজ ফাইল অ্যানালাইসিস
                </h3>
                <p className="text-xs sm:text-sm text-[#444746] dark:text-[#9aa0a6] leading-[1.75]">
                  বড় PDF বই, ক্লায়েন্টের DOCX ব্রিফ, এক্সেল টেবিল কিংবা যেকোনো স্ক্রিনশট আপলোড করুন। কয়েক সেকেন্ডেই বাংলায় সারসংক্ষেপ, অনুবাদ বা নিখুঁত উত্তর পেয়ে যাবেন।
                </p>
              </div>
              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2 text-xs text-[#444746] dark:text-[#9aa0a6]">
                <span>PDF ডকুমেন্ট</span>
                <span aria-hidden="true">·</span>
                <span>Word (DOCX)</span>
                <span aria-hidden="true">·</span>
                <span>ছবি ও স্ক্রিনশট</span>
              </div>
            </div>

            {/* Feature 3: One-Click PDF & PPTX Generator */}
            <div className="card-minimal md:col-span-2 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3]">
                <FileSpreadsheet className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                ওয়ান-ক্লিক PDF ও PPTX প্রেজেন্টেশন জেনারেটর
              </h3>
              <p className="text-xs sm:text-[13px] text-[#444746] dark:text-[#9aa0a6] leading-[1.75]">
                অফিস প্রেজেন্টেশন, ভার্সিটি অ্যাসাইনমেন্ট বা ক্লায়েন্ট রিপোর্ট—বিষয় লিখে দিন, এক ক্লিকেই রেডি-টু-ডাউনলোড PDF ও পাওয়ারপয়েন্ট (PPTX) স্লাইড তৈরি হয়ে যাবে।
              </p>
            </div>

            {/* Feature 4: AI Image & Video Studio */}
            <div className="card-minimal md:col-span-2 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3]">
                <ImageIcon className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                AI ইমেজ ও ভিডিও স্টুডিও
              </h3>
              <p className="text-xs sm:text-[13px] text-[#444746] dark:text-[#9aa0a6] leading-[1.75]">
                ফেসবুক অ্যাড ভিজ্যুয়াল, ইউটিউব থাম্বনেইল, প্রোডাক্ট ডিজাইন বা ক্রিয়েটিভ মিডিয়া তৈরি করুন সরাসরি ওয়ার্কস্পেসের ভেতর থেকেই—কোনো অতিরিক্ত টুল ছাড়াই।
              </p>
            </div>

            {/* Feature 5: Persistent Memory */}
            <div className="card-minimal md:col-span-2 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3]">
                <Brain className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                পার্সিস্টেন্ট মেমোরি ও সুরক্ষিত হিস্ট্রি
              </h3>
              <p className="text-xs sm:text-[13px] text-[#444746] dark:text-[#9aa0a6] leading-[1.75]">
                আপনার প্রতিটি প্রজেক্ট, কথোপকথন ও কাজের ধরন মনে রাখে আপনার পার্সোনাল ওয়ার্কস্পেস। যেকোনো ডিভাইস থেকে লগইন করে আগের জায়গা থেকেই শুরু করুন।
              </p>
            </div>
          </div>
        </section>

        {/* 4. PRICING SECTION */}
        <section
          id="offer-pricing"
          aria-label="সাবস্ক্রিপশন প্ল্যান ও মূল্য"
          className="max-w-5xl mx-auto px-4 sm:px-6 scroll-mt-20"
        >
          <div className="rounded-3xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-5 sm:p-8 lg:p-10">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-2.5">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                লিমিটেড টাইম অফার · কোনো হিডেন চার্জ নেই
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-[1.24] text-[#1f1f1f] dark:text-[#e3e3e3] text-balance">
                আপনার প্রয়োজন অনুযায়ী প্ল্যান বেছে নিন
              </h2>
              <p className="text-sm sm:text-base text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
                এক সাবস্ক্রিপশনেই ১০+ প্রিমিয়াম AI। সরাসরি বিকাশ ও নগদে নিরাপদ পেমেন্ট।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
              {/* Monthly Plan Card (৬৯৯৳/মাস) */}
              <div
                data-testid="offer-plan-monthly"
                className="rounded-2xl bg-white dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] p-5 sm:p-7 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                      মাসিক প্ল্যান
                    </h3>
                    <span className="text-xs font-mono font-medium text-[#444746] dark:text-[#9aa0a6] tabular-nums">
                      ১M টোকেন / মাস
                    </span>
                  </div>
                  <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-1">
                    নতুন শুরু করার জন্য সবচেয়ে সহজ ও ফ্লেক্সিবল প্ল্যান
                  </p>

                  <div className="mt-5 pb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl sm:text-4xl font-bold font-mono text-[#1f1f1f] dark:text-[#e3e3e3] tabular-nums">
                        ৳৬৯৯
                      </span>
                      <span className="text-sm text-[#444746] dark:text-[#9aa0a6]">/মাস</span>
                      <span className="text-sm font-mono text-[#444746]/70 dark:text-[#9aa0a6]/70 line-through tabular-nums">
                        ৳১,৪৯৯
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1.5">
                      ৫৩% স্পেশাল ডিসকাউন্ট · মেয়াদ ৩০ দিন
                    </p>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {MONTHLY_FEATURES.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-xs sm:text-[13px] text-[#444746] dark:text-[#e3e3e3] leading-relaxed"
                      >
                        <span
                          aria-hidden="true"
                          className="w-4.5 h-4.5 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.1] text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center justify-center shrink-0 mt-0.5"
                        >
                          <Check className="w-2.5 h-2.5 stroke-[2.75]" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-7">
                  <button
                    type="button"
                    onClick={() => handleSubscribe('monthly')}
                    data-testid="offer-buy-monthly-btn"
                    className="btn-pill-secondary w-full !min-h-[46px] sm:!h-11 !text-sm !font-semibold !justify-center !border-[#1f1f1f]/25 dark:!border-[#e3e3e3]/25 hover:!bg-[#1f1f1f] hover:!text-white dark:hover:!bg-[#e3e3e3] dark:hover:!text-[#131314]"
                  >
                    <span>{isSubscribed ? 'ওয়ার্কস্পেসে যান' : 'মাসিক প্ল্যান নিন — ৳৬৯৯'}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Yearly Plan Card (৫,৯৯৯৳/বছর — Best Value Highlight) */}
              <div
                data-testid="offer-plan-yearly"
                className="relative rounded-2xl bg-white dark:bg-[#131314] border-2 border-[#1f1f1f] dark:border-[#e3e3e3] p-5 sm:p-7 flex flex-col justify-between"
              >
                <div className="absolute -top-3 right-5 px-3 py-0.5 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[11px] font-bold tracking-tight whitespace-nowrap inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>Best Value · মাসে মাত্র ৫০০৳</span>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                      বার্ষিক প্ল্যান
                    </h3>
                    <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      ১৫M টোকেন / বছর
                    </span>
                  </div>
                  <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-1">
                    নিয়মিত ব্যবহারকারী ও প্রফেশনালদের জন্য সর্বোচ্চ সাশ্রয়ী প্ল্যান
                  </p>

                  <div className="mt-5 pb-5 border-b border-black/[0.08] dark:border-white/[0.08]">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl sm:text-4xl font-bold font-mono text-[#1f1f1f] dark:text-[#e3e3e3] tabular-nums">
                        ৳৫,৯৯৯
                      </span>
                      <span className="text-sm text-[#444746] dark:text-[#9aa0a6]">/বছর</span>
                      <span className="text-sm font-mono text-[#444746]/70 dark:text-[#9aa0a6]/70 line-through tabular-nums">
                        ৳১৪,৯৯৯
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1.5">
                      মাসে মাত্র ৫০০৳ · বছরে ২,৩৮৯৳ সাশ্রয় (মেয়াদ ৩৬৫ দিন)
                    </p>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {YEARLY_FEATURES.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-xs sm:text-[13px] text-[#1f1f1f] dark:text-[#e3e3e3] leading-relaxed"
                      >
                        <span
                          aria-hidden="true"
                          className="w-4.5 h-4.5 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] flex items-center justify-center shrink-0 mt-0.5"
                        >
                          <Check className="w-2.5 h-2.5 stroke-[2.75]" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-7">
                  <button
                    type="button"
                    onClick={() => handleSubscribe('yearly')}
                    data-testid="offer-buy-yearly-btn"
                    className="btn-pill-primary w-full !min-h-[46px] sm:!h-11 !text-sm !font-semibold !justify-center"
                  >
                    <span>{isSubscribed ? 'ওয়ার্কস্পেসে যান' : 'বার্ষিক প্ল্যান নিন — ৳৫,৯৯৯'}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {/* Secondary Tutorial Video Nudge */}
            <div className="mt-6 pt-5 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-xs sm:text-[13px] text-[#444746] dark:text-[#9aa0a6]">
              <span>পেমেন্ট করার নিয়ম নিয়ে কোনো কনফিউশন আছে?</span>
              <button
                type="button"
                onClick={openTutorialModal}
                className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] hover:underline inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>কীভাবে কিনবেন ভিডিও টিউটোরিয়াল দেখুন</span>
              </button>
            </div>
          </div>
        </section>

        {/* 5. TRUST & PAYMENT METHODS + STEP-BY-STEP TRXID ACTIVATION GUIDE */}
        <section
          aria-label="পেমেন্ট মাধ্যম ও অ্যাক্টিভেশন গাইড"
          className="max-w-5xl mx-auto px-4 sm:px-6"
        >
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-2.5">
            <p className="text-xs font-medium text-[#444746] dark:text-[#9aa0a6]">
              নিরাপদ লোকাল পেমেন্ট · Express Checkout
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-[1.28] text-[#1f1f1f] dark:text-[#e3e3e3] text-balance">
              বিকাশ ও নগদে মাত্র ৩ ধাপে দ্রুত অ্যাকাউন্ট চালু করুন
            </h2>
          </div>

          {/* Payment Method Badges Strip */}
          <div className="rounded-2xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              {/* bKash Brand Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white dark:bg-[#131314] border border-[#E2136E]/30">
                <img
                  src="https://bongotopup.com/wp-content/uploads/2026/01/bkash-icon.png"
                  alt="bKash"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 object-contain rounded-lg shrink-0 bg-white p-0.5"
                />
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                    বিকাশ (bKash)
                  </p>
                  <p className="text-[10px] text-[#444746] dark:text-[#9aa0a6]">
                    Send Money · TrxID
                  </p>
                </div>
              </div>

              {/* Nagad Brand Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white dark:bg-[#131314] border border-[#F7941D]/35">
                <img
                  src="https://bongotopup.com/wp-content/uploads/2026/01/nagad-icon1.png"
                  alt="Nagad"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 object-contain rounded-lg shrink-0 bg-white p-0.5"
                />
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                    নগদ (Nagad)
                  </p>
                  <p className="text-[10px] text-[#444746] dark:text-[#9aa0a6]">
                    Send Money · TrxID
                  </p>
                </div>
              </div>

              {/* Rocket Brand Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white dark:bg-[#131314] border border-[#8C3494]/35">
                <img
                  src="https://bongotopup.com/wp-content/uploads/2026/01/rocket-icon-removebg-preview.png"
                  alt="Rocket"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 object-contain rounded-lg shrink-0 bg-white p-0.5"
                />
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                    রকেট (Rocket)
                  </p>
                  <p className="text-[10px] text-[#444746] dark:text-[#9aa0a6]">
                    Send Money · TrxID
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-1.5 text-xs text-[#444746] dark:text-[#9aa0a6]">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>TLS 1.3 সুরক্ষিত চেকআউট</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-[#1f1f1f] dark:text-[#e3e3e3]" aria-hidden="true" />
                <span>কোনো কার্ডের প্রয়োজন নেই</span>
              </span>
            </div>
          </div>

          {/* 3-Step TrxID Visual Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ACTIVATION_STEPS.map((item) => (
              <div
                key={item.step}
                className="card-minimal p-5 sm:p-6 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-xs font-bold tabular-nums">
                    {item.step}
                  </span>
                  <h3 className="text-base font-bold text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#444746] dark:text-[#9aa0a6] leading-[1.75]">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. CONVERSION-FOCUSED FAQ ACCORDION (Bengali) */}
        <section
          aria-label="সচরাচর জিজ্ঞাসিত প্রশ্ন"
          className="max-w-5xl mx-auto px-4 sm:px-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#444746] dark:text-[#9aa0a6]">
                  সাধারণ জিজ্ঞাসা
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-[1.28] text-[#1f1f1f] dark:text-[#e3e3e3]">
                  মনে কোনো প্রশ্ন আছে?
                </h2>
                <p className="text-xs sm:text-sm text-[#444746] dark:text-[#9aa0a6] leading-[1.75]">
                  সাবস্ক্রিপশন নেওয়ার আগে বাংলাদেশের ব্যবহারকারীদের সবচেয়ে সাধারণ প্রশ্নগুলোর উত্তর জেনে নিন।
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSubscribe('monthly')}
                className="btn-pill-primary !min-h-11 !px-6 !text-xs sm:!text-sm !whitespace-nowrap"
              >
                <span>{isSubscribed ? 'ওয়ার্কস্পেসে যান' : 'এখনই অ্যাক্সেস নিন — ৳৬৯৯'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </div>

            <div className="lg:col-span-8 space-y-3">
              {OFFER_FAQS.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={faq.question}
                    className={`rounded-2xl transition-colors duration-150 overflow-hidden ${
                      isOpen
                        ? 'bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.14] dark:border-white/[0.16]'
                        : 'bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] hover:border-black/15 dark:hover:border-white/15'
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqIndex((prev) => (prev === idx ? null : idx))}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#1f1f1f] dark:focus-visible:outline-[#e3e3e3]"
                    >
                      <span className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3] leading-snug">
                        {faq.question}
                      </span>
                      {isOpen ? (
                        <ChevronUp
                          className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <ChevronDown
                          className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6] shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-4 pt-3 text-xs sm:text-[13.5px] text-[#444746] dark:text-[#c4c7c5] leading-[1.8] border-t border-black/[0.06] dark:border-white/[0.06]">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final Distraction-Free Conversion Band */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-10 text-center space-y-5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-[1.28] text-[#1f1f1f] dark:text-[#e3e3e3] max-w-2xl mx-auto text-balance">
              আজই শুরু করুন আপনার পার্সোনাল প্রিমিয়াম AI ওয়ার্কস্পেস
            </h2>
            <p className="text-sm sm:text-base text-[#444746] dark:text-[#9aa0a6] max-w-xl mx-auto leading-[1.75]">
              মাত্র ৬৯৯ টাকায় বিশ্বের সেরা ১০+ AI মডেল—কোনো ডলার কার্ড বা শেয়ার্ড অ্যাকাউন্টের ঝামেলা ছাড়াই।
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleSubscribe('monthly')}
                className="btn-pill-primary w-full sm:w-auto !min-h-[48px] sm:!h-12 !px-8 !text-sm sm:!text-[15px] !font-semibold !whitespace-nowrap"
              >
                <span>{isSubscribed ? 'AI ওয়ার্কস্পেস ওপেন করুন' : 'আজই সাবস্ক্রাইব করুন — ৳৬৯৯'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleSubscribe('yearly')}
                className="btn-pill-secondary w-full sm:w-auto !min-h-[48px] sm:!h-12 !px-7 !text-sm !font-medium !whitespace-nowrap"
              >
                <span>বার্ষিক প্ল্যান নিন — ৳৫,৯৯৯ (বেস্ট ভ্যালু)</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Distraction-Free Copyright Bar (No Outbound Navigation Links) */}
      <footer className="mt-14 border-t border-black/[0.08] dark:border-white/[0.08] py-6 px-4 text-center text-xs text-[#444746] dark:text-[#9aa0a6]">
        <p>
          © 2026 Bangla AI (bangla-ai.pro) · ১০০% পার্সোনাল ও নিরাপদ AI ওয়ার্কস্পেস · বিকাশ ও নগদ সাপোর্টেড
        </p>
      </footer>

      {/* 7. STICKY BOTTOM MOBILE CTA (Compact < 15% mobile viewport cap) */}
      <div
        data-testid="offer-mobile-sticky-cta"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#131314]/95 backdrop-blur-md px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold text-[#1f1f1f] dark:text-[#e3e3e3] tabular-nums truncate">
              মাত্র ৬৯৯৳/মাস
            </p>
            <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] truncate">
              ১০+ প্রিমিয়াম AI · বিকাশ ও নগদ
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSubscribe('monthly')}
            data-testid="offer-mobile-sticky-btn"
            className="btn-pill-primary !min-h-[42px] !h-[42px] !py-0 !px-5 !text-xs !font-semibold !whitespace-nowrap shrink-0"
          >
            <span>{isSubscribed ? 'Open Workspace' : 'Get Access Now'}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
