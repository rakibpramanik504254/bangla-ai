import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Copy,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { BrandLogo } from '../common/BrandLogo.tsx';
import { WatchTutorialButton } from '../common/WatchTutorialButton.tsx';
import { PLANS, formatBDT } from '../../utils/billing.ts';
import {
  MfsGatewayId,
  isValidBdPhoneNumber,
  isValidEmailAddress,
  normalizeBdPhoneNumber,
  resolveActiveMfsGateway,
  resolveEnabledMfsGateways,
} from '../../utils/expressCheckout.ts';
import { buildCheckoutUrl, type CheckoutPlanId } from '../../utils/navigation.ts';
import {
  trackMetaAddPaymentInfo,
  trackMetaInitiateCheckout,
} from '../../utils/metaPixel.ts';

interface CheckoutPageProps {
  initialPlan?: CheckoutPlanId;
  onBack: () => void;
  onSuccessRedirectToChat: () => void;
  onNavigateHome: () => void;
}

interface PaymentSettings {
  bkash_number: string;
  nagad_number: string;
  rocket_number: string;
  bkash_enabled: boolean;
  nagad_enabled: boolean;
  rocket_enabled: boolean;
}

interface SubmittedState {
  trxId: string;
  gateway: string;
  senderNumber: string;
  amount: number;
  planName: string;
  autoAuthenticated?: boolean;
  accountExistsNotice?: boolean;
  receiptEmail?: string;
}

const MFS_GATEWAYS: readonly {
  id: MfsGatewayId;
  name: string;
  bangla: string;
  ussd: string;
  icon: string;
  activeClass: string;
}[] = [
  {
    id: 'bkash',
    name: 'bKash',
    bangla: 'বিকাশ',
    ussd: '*247#',
    icon: 'https://bongotopup.com/wp-content/uploads/2026/01/bkash-icon.png',
    activeClass:
      'border-[#E2136E] ring-1 ring-[#E2136E]/35 bg-[#E2136E]/[0.06] dark:bg-[#E2136E]/[0.14]',
  },
  {
    id: 'nagad',
    name: 'Nagad',
    bangla: 'নগদ',
    ussd: '*167#',
    icon: 'https://bongotopup.com/wp-content/uploads/2026/01/nagad-icon1.png',
    activeClass:
      'border-[#F7941D] ring-1 ring-[#F7941D]/35 bg-[#F7941D]/[0.06] dark:bg-[#F7941D]/[0.14]',
  },
  {
    id: 'rocket',
    name: 'Rocket',
    bangla: 'রকেট',
    ussd: '*322#',
    icon: 'https://bongotopup.com/wp-content/uploads/2026/01/rocket-icon-removebg-preview.png',
    activeClass:
      'border-[#8C3494] ring-1 ring-[#8C3494]/35 bg-[#8C3494]/[0.06] dark:bg-[#8C3494]/[0.14]',
  },
];

const PLAN_BENEFITS: Record<CheckoutPlanId, readonly string[]> = {
  monthly: [
    '১০+ প্রিমিয়াম AI মডেল (ChatGPT, Claude, Gemini, Grok, DeepSeek)',
    '১,০০০,০০০ (1M) হাই-স্পিড টোকেন কোটা',
    '১০০% পার্সোনাল ও প্রাইভেট ওয়ার্কস্পেস',
    'দ্রুত TrxID ভেরিফিকেশন ও অ্যাক্টিভেশন',
  ],
  yearly: [
    '১০+ প্রিমিয়াম AI মডেল + নতুন মডেলে আর্লি অ্যাক্সেস',
    '১৫,০০০,০০০ (15M) বার্ষিক টোকেন কোটা',
    'মাসে মাত্র ৳৫০০ — বছরে ৳২,৩৮৯ সরাসরি সাশ্রয়',
    'প্রায়োরিটি সার্ভার ও দ্রুত অ্যাক্টিভেশন',
  ],
};

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  initialPlan = 'monthly',
  onBack,
  onSuccessRedirectToChat,
  onNavigateHome,
}) => {
  const { user, token, refreshUser, applySession, openAuthModal } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlanId>(initialPlan);
  const [gateway, setGateway] = useState<MfsGatewayId>('bkash');
  const [senderNumber, setSenderNumber] = useState(user?.phone || '');
  const [guestEmail, setGuestEmail] = useState('');
  const [trxId, setTrxId] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedPayment, setSubmittedPayment] = useState<SubmittedState | null>(null);

  // Optional 1-line password setup for brand-new Express Checkout users
  const [quickPassword, setQuickPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    bkash_number: '01812345678',
    nagad_number: '01712345678',
    rocket_number: '01912345678',
    bkash_enabled: true,
    nagad_enabled: true,
    rocket_enabled: true,
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const plan = PLANS[selectedPlan];
  const isAuthenticated = Boolean(user && token);
  const enabledGatewayIds = resolveEnabledMfsGateways(paymentSettings);
  const visibleGateways = MFS_GATEWAYS.filter((item) => enabledGatewayIds.includes(item.id));

  // Sync incoming initialPlan when query param changes
  useEffect(() => {
    setSelectedPlan(initialPlan);
  }, [initialPlan]);

  // Fetch merchant MFS numbers and enabled gateways
  useEffect(() => {
    let cancelled = false;
    setSettingsLoaded(false);
    fetch('/api/payment/settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data && data.bkash_number) {
          const nextSettings: PaymentSettings = {
            bkash_number: data.bkash_number,
            nagad_number: data.nagad_number,
            rocket_number: data.rocket_number,
            bkash_enabled: data.bkash_enabled !== false,
            nagad_enabled: data.nagad_enabled !== false,
            rocket_enabled: data.rocket_enabled !== false,
          };
          setPaymentSettings(nextSettings);
          const activeIds = resolveEnabledMfsGateways(nextSettings);
          setGateway((prev) => resolveActiveMfsGateway(activeIds, prev));
        }
      })
      .catch((err) => console.error('Failed to load payment numbers:', err))
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Track Meta InitiateCheckout whenever plan changes
  useEffect(() => {
    trackMetaInitiateCheckout(plan.name, plan.priceBDT);
  }, [plan.name, plan.priceBDT]);

  // Keep selected gateway valid if settings disable a gateway
  useEffect(() => {
    if (enabledGatewayIds.length > 0 && !enabledGatewayIds.includes(gateway)) {
      setGateway(resolveActiveMfsGateway(enabledGatewayIds, gateway));
    }
  }, [enabledGatewayIds.join(','), gateway]);

  // Pre-fill authenticated user's saved phone number
  useEffect(() => {
    if (user?.phone && !senderNumber) {
      setSenderNumber(user.phone);
    }
  }, [user, senderNumber]);

  const handleSelectPlan = (nextPlan: CheckoutPlanId) => {
    setSelectedPlan(nextPlan);
    setError(null);
    if (typeof window !== 'undefined' && window.location.pathname === '/checkout') {
      const targetUrl = buildCheckoutUrl(nextPlan);
      if (`${window.location.pathname}${window.location.search}` !== targetUrl) {
        window.history.replaceState({ view: 'checkout', plan: nextPlan }, '', targetUrl);
      }
    }
  };

  const activeGateway =
    visibleGateways.find((g) => g.id === gateway) || visibleGateways[0] || MFS_GATEWAYS[0];

  const activeMerchantNumber =
    gateway === 'bkash'
      ? paymentSettings.bkash_number
      : gateway === 'nagad'
      ? paymentSettings.nagad_number
      : paymentSettings.rocket_number;

  const handleCopyMerchant = async () => {
    const cleanNumber = activeMerchantNumber.replace(/[^0-9]/g, '');
    try {
      await navigator.clipboard.writeText(cleanNumber);
    } catch {
      const input = document.createElement('input');
      input.value = cleanNumber;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTrx = trxId.trim().toUpperCase();
    if (!cleanTrx || cleanTrx.length < 6) {
      setError('অনুগ্রহ করে আপনার SMS থেকে প্রাপ্ত সঠিক Transaction ID (TrxID) লিখুন।');
      return;
    }

    const cleanSender = normalizeBdPhoneNumber(senderNumber);
    if (!isValidBdPhoneNumber(cleanSender)) {
      setError('অনুগ্রহ করে সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX)।');
      return;
    }

    const trimmedEmail = guestEmail.trim().toLowerCase();
    if (!isAuthenticated && trimmedEmail && !isValidEmailAddress(trimmedEmail)) {
      setError('অনুগ্রহ করে সঠিক ইমেইল দিন অথবা ইমেইল ঘরটি খালি রাখুন।');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const endpoint = isAuthenticated ? '/api/payments/verify' : '/api/payments/express';
      const minDelay = new Promise((resolve) => setTimeout(resolve, 900));
      const fetchPromise = fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAuthenticated && token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(
          isAuthenticated
            ? {
                planId: selectedPlan,
                gateway,
                senderNumber: cleanSender,
                trxId: cleanTrx,
              }
            : {
                planId: selectedPlan,
                gateway,
                senderNumber: cleanSender,
                trxId: cleanTrx,
                ...(trimmedEmail ? { email: trimmedEmail } : {}),
              }
        ),
      });

      const [res] = await Promise.all([fetchPromise, minDelay]);

      let resData: any = {};
      const responseText = await res.text();
      try {
        resData = JSON.parse(responseText);
      } catch {
        resData = { error: responseText || 'Unknown server response' };
      }

      if (!res.ok) {
        throw new Error(resData.error || 'Payment verification submission failed.');
      }

      trackMetaAddPaymentInfo(plan.name, plan.priceBDT, gateway);

      if (!isAuthenticated && resData.autoAuthenticated && resData.token && resData.user) {
        applySession(resData.token, resData.user);
      } else if (isAuthenticated) {
        await refreshUser();
      }

      setSubmittedPayment({
        trxId: cleanTrx,
        gateway,
        senderNumber: cleanSender,
        amount: plan.priceBDT,
        planName: plan.name,
        autoAuthenticated: Boolean(resData.autoAuthenticated),
        accountExistsNotice: Boolean(resData.accountExists),
        receiptEmail:
          trimmedEmail ||
          (user?.email && !user.email.endsWith('@phone.bangla-ai.pro') ? user.email : undefined),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'পেমেন্ট সাবমিট করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveQuickPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeToken = token || localStorage.getItem('bangla_ai_token');
    if (!activeToken) return;
    if (quickPassword.length < 6) {
      setPasswordError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ newPassword: quickPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not save password.');
      }
      setPasswordSaved(true);
    } catch (err: any) {
      setPasswordError(err.message || 'পাসওয়ার্ড সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setSavingPassword(false);
    }
  };

  const formattedAmount = formatBDT(plan.priceBDT);
  const banglaPlanTitle = selectedPlan === 'yearly' ? 'বার্ষিক প্ল্যান (Yearly Pro)' : 'মাসিক প্ল্যান (Monthly Pro)';
  const validityLabel = selectedPlan === 'yearly' ? '৩৬৫ দিন (১ বছর)' : '৩০ দিন (১ মাস)';
  const tokenQuotaLabel = selectedPlan === 'yearly' ? '১৫,০০০,০০০ (15M) টোকেন' : '১,০০০,০০০ (1M) টোকেন';

  return (
    <div
      lang="bn"
      data-testid="checkout-page"
      className="min-h-screen w-full bg-white dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] transition-colors [font-family:'Hind_Siliguri','Plus_Jakarta_Sans',sans-serif] pb-24 sm:pb-16"
    >
      {/* Distraction-Free Top Bar: Back Button + Bangla AI Logo Only */}
      <header
        data-testid="checkout-header"
        className="sticky top-0 z-40 w-full border-b border-black/[0.08] dark:border-white/[0.08] bg-white/90 dark:bg-[#131314]/90 backdrop-blur-md transition-colors"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            data-testid="checkout-back-btn"
            className="btn-pill-secondary !min-h-9 !h-9 !py-0 !px-3.5 !text-xs sm:!text-sm !font-medium !whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <BrandLogo className="w-7 h-7 shrink-0" />
            <span className="text-[15px] sm:text-base font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] [font-family:'Plus_Jakarta_Sans','Hind_Siliguri',sans-serif]">
              Bangla AI
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#444746] dark:text-[#9aa0a6] whitespace-nowrap shrink-0">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Secure Checkout</span>
          </div>
        </div>
      </header>

      {/* Copied Toast Notification */}
      {copied && (
        <div
          role="status"
          aria-live="polite"
          data-testid="checkout-copied-toast"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2"
        >
          <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-700 shrink-0" />
          <span>নম্বর কপি হয়েছে: {activeMerchantNumber}</span>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-7">
        {submittedPayment ? (
          /* Spacious Post-Submission Confirmation Receipt */
          <div
            data-testid="checkout-confirmation"
            className="max-w-xl mx-auto rounded-3xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-5 sm:p-8 space-y-6 animate-in fade-in"
          >
            <div className="text-center space-y-2.5">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <Clock className="w-7 h-7" />
              </div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {submittedPayment.autoAuthenticated
                  ? 'অর্ডার সফলভাবে জমা হয়েছে · আপনার অ্যাকাউন্ট অটো-সাইন ইন হয়েছে'
                  : 'পেমেন্ট রিকোয়েস্ট জমা হয়েছে · ভেরিফিকেশন প্রক্রিয়াধীন'}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
                Verification Pending
              </h1>
              <p className="text-xs sm:text-sm text-[#444746] dark:text-[#9aa0a6] max-w-md mx-auto leading-[1.75]">
                {submittedPayment.receiptEmail
                  ? `আমরা ${submittedPayment.receiptEmail} ঠিকানায় কনফার্মেশন পাঠিয়েছি। আপনার TrxID ভেরিফাই হওয়ার সাথে সাথেই প্রো অ্যাক্সেস চালু হয়ে যাবে।`
                  : 'আমরা আপনার TrxID পেয়েছি! সাধারণত ৫–১৫ মিনিটের মধ্যে ভেরিফাই করে আপনার প্রো অ্যাক্সেস চালু করে দেওয়া হবে।'}
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 text-xs sm:text-sm divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              <div className="py-2.5 flex justify-between items-center gap-3">
                <span className="text-[#444746] dark:text-[#9aa0a6]">প্ল্যান</span>
                <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  {submittedPayment.planName}
                </span>
              </div>
              <div className="py-2.5 flex justify-between items-center gap-3">
                <span className="text-[#444746] dark:text-[#9aa0a6]">পরিমাণ ও মাধ্যম</span>
                <span className="font-semibold tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]">
                  {formatBDT(submittedPayment.amount)} · {submittedPayment.gateway.toUpperCase()}
                </span>
              </div>
              <div className="py-2.5 flex justify-between items-center gap-3">
                <span className="text-[#444746] dark:text-[#9aa0a6]">প্রেরকের মোবাইল নম্বর</span>
                <span className="font-semibold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]">
                  {submittedPayment.senderNumber}
                </span>
              </div>
              <div className="py-2.5 flex justify-between items-center gap-3">
                <span className="text-[#444746] dark:text-[#9aa0a6]">Transaction ID (TrxID)</span>
                <span className="font-bold font-mono tracking-wider text-emerald-700 dark:text-emerald-400 break-all">
                  {submittedPayment.trxId}
                </span>
              </div>
            </div>

            {/* Optional Quick Password Setup for Brand-New Express Users */}
            {submittedPayment.autoAuthenticated && (
              <form
                onSubmit={handleSaveQuickPassword}
                className="rounded-2xl bg-white dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                    <span>ভবিষ্যতে লগইনের জন্য পাসওয়ার্ড সেট করুন (ঐচ্ছিক)</span>
                  </span>
                  {passwordSaved && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      সেভ হয়েছে ✓
                    </span>
                  )}
                </div>
                {!passwordSaved && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="password"
                      value={quickPassword}
                      onChange={(e) => setQuickPassword(e.target.value)}
                      placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন"
                      className="flex-1 min-w-0 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                    />
                    <button
                      type="submit"
                      disabled={savingPassword || quickPassword.length < 6}
                      className="btn-pill-primary !min-h-10 !h-10 !px-5 !text-xs shrink-0 disabled:opacity-50"
                    >
                      {savingPassword ? 'সেভ হচ্ছে...' : 'পাসওয়ার্ড সেভ করুন'}
                    </button>
                  </div>
                )}
                {passwordError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{passwordError}</p>
                )}
              </form>
            )}

            {submittedPayment.accountExistsNotice && !isAuthenticated && (
              <div className="text-center text-xs text-[#444746] dark:text-[#9aa0a6]">
                এই নম্বর বা ইমেইলে আগে থেকেই অ্যাকাউন্ট রয়েছে।{' '}
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] underline cursor-pointer"
                >
                  স্ট্যাটাস দেখতে সাইন ইন করুন
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={onSuccessRedirectToChat}
                  className="btn-pill-primary w-full sm:w-auto !min-h-11 !px-7 !text-sm"
                >
                  <span>AI ওয়ার্কস্পেসে যান</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              )}
              <button
                type="button"
                onClick={onNavigateHome}
                className="btn-pill-secondary w-full sm:w-auto !min-h-11 !px-6 !text-sm"
              >
                হোমপেজে ফিরে যান
              </button>
            </div>
          </div>
        ) : (
          /* Spacious 2-Column Dedicated Checkout Flow */
          <div className="space-y-5 sm:space-y-6">
            {/* Page Heading + Auth Status */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-black/[0.08] dark:border-white/[0.08]">
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#444746] dark:text-[#9aa0a6]">
                  {isAuthenticated
                    ? `সাইন ইন করা আছে · ${
                        user?.email?.endsWith('@phone.bangla-ai.pro') ? user.phone : user?.email
                      }`
                    : 'Express Checkout · আলাদা রেজিস্ট্রেশন ছাড়াই ১ মিনিটে সাবস্ক্রিপশন'}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-[1.24] text-[#1f1f1f] dark:text-[#e3e3e3]">
                  আপনার Bangla AI প্রো প্ল্যান চালু করুন
                </h1>
              </div>

              {!isAuthenticated && (
                <p className="text-xs sm:text-[13px] text-[#444746] dark:text-[#9aa0a6] shrink-0">
                  আগে থেকে অ্যাকাউন্ট আছে?{' '}
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    data-testid="checkout-signin-link"
                    className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] underline underline-offset-4 cursor-pointer"
                  >
                    সাইন ইন করুন
                  </button>
                </p>
              )}
            </div>

            {/* 2-Column Desktop / Stacked Mobile Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* LEFT COLUMN: Plan Selector + Payment Method Tabs + Guide + Tutorial */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Plan Selector */}
                <section
                  aria-label="প্ল্যান নির্বাচন"
                  className="rounded-3xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-6 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                      ০১. প্ল্যান সিলেক্ট করুন
                    </h2>
                    <span className="text-xs text-[#444746] dark:text-[#9aa0a6]">
                      যেকোনো সময় পরিবর্তনযোগ্য
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    {/* Monthly Option */}
                    <button
                      type="button"
                      onClick={() => handleSelectPlan('monthly')}
                      aria-pressed={selectedPlan === 'monthly'}
                      data-testid="checkout-plan-monthly"
                      className={`relative text-left rounded-2xl p-4 sm:p-5 transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f] dark:focus-visible:outline-[#e3e3e3] ${
                        selectedPlan === 'monthly'
                          ? 'border-2 border-[#1f1f1f] dark:border-[#e3e3e3] bg-white dark:bg-[#131314]'
                          : 'border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-[#131314]/65 hover:border-black/20 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                          Monthly Plan
                        </span>
                        <span
                          aria-hidden="true"
                          className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selectedPlan === 'monthly'
                              ? 'border-[#1f1f1f] bg-[#1f1f1f] dark:border-[#e3e3e3] dark:bg-[#e3e3e3]'
                              : 'border-black/25 dark:border-white/25 bg-transparent'
                          }`}
                        >
                          {selectedPlan === 'monthly' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#131314]" />
                          )}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-2xl font-bold tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]">
                          ৬৯৯৳
                        </span>
                        <span className="text-xs text-[#444746] dark:text-[#9aa0a6]">/ মাস</span>
                        <span className="text-xs tabular-nums text-[#444746]/70 dark:text-[#9aa0a6]/70 line-through">
                          ১,৪৯৯৳
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs text-[#444746] dark:text-[#9aa0a6]">
                        ১M টোকেন · মেয়াদ ৩০ দিন
                      </p>
                    </button>

                    {/* Yearly Option */}
                    <button
                      type="button"
                      onClick={() => handleSelectPlan('yearly')}
                      aria-pressed={selectedPlan === 'yearly'}
                      data-testid="checkout-plan-yearly"
                      className={`relative text-left rounded-2xl p-4 sm:p-5 transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f] dark:focus-visible:outline-[#e3e3e3] ${
                        selectedPlan === 'yearly'
                          ? 'border-2 border-[#1f1f1f] dark:border-[#e3e3e3] bg-white dark:bg-[#131314]'
                          : 'border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-[#131314]/65 hover:border-black/20 dark:hover:border-white/20'
                      }`}
                    >
                      <span className="absolute -top-2.5 right-3.5 px-2.5 py-0.5 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[10px] font-bold tracking-tight whitespace-nowrap inline-flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
                        <span>Save ৳2,389</span>
                      </span>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                          Yearly Plan
                        </span>
                        <span
                          aria-hidden="true"
                          className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selectedPlan === 'yearly'
                              ? 'border-[#1f1f1f] bg-[#1f1f1f] dark:border-[#e3e3e3] dark:bg-[#e3e3e3]'
                              : 'border-black/25 dark:border-white/25 bg-transparent'
                          }`}
                        >
                          {selectedPlan === 'yearly' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#131314]" />
                          )}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-2xl font-bold tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]">
                          ৫,৯৯৯৳
                        </span>
                        <span className="text-xs text-[#444746] dark:text-[#9aa0a6]">/ বছর</span>
                        <span className="text-xs tabular-nums text-[#444746]/70 dark:text-[#9aa0a6]/70 line-through">
                          ১৪,৯৯৯৳
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        মাসে মাত্র ৫০০৳ · ১৫M টোকেন কোটা
                      </p>
                    </button>
                  </div>
                </section>

                {/* 2. Payment Method Tabs + Merchant Number + Step-by-Step Guide */}
                <section
                  aria-label="পেমেন্ট মাধ্যম ও নির্দেশনা"
                  className="rounded-3xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-6 space-y-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                      ০২. পেমেন্ট মাধ্যম নির্বাচন ও Send Money করুন
                    </h2>
                  </div>

                  {/* Interactive MFS Tabs */}
                  {!settingsLoaded ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div className="h-12 rounded-2xl bg-white/70 dark:bg-[#131314]/70 animate-pulse" />
                      <div className="h-12 rounded-2xl bg-white/70 dark:bg-[#131314]/70 animate-pulse" />
                    </div>
                  ) : (
                    <div
                      role="tablist"
                      aria-label="মোবাইল ব্যাংকিং মাধ্যম"
                      data-testid="checkout-gateway-selector"
                      className={`grid gap-2.5 ${
                        visibleGateways.length <= 1
                          ? 'grid-cols-1'
                          : visibleGateways.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-3'
                      }`}
                    >
                      {visibleGateways.map((item) => {
                        const isActive = gateway === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            data-testid={`checkout-gateway-btn-${item.id}`}
                            onClick={() => {
                              setGateway(item.id);
                              setCopied(false);
                            }}
                            className={`h-12 px-3 rounded-2xl border flex items-center justify-center gap-2.5 transition-all cursor-pointer min-w-0 ${
                              isActive
                                ? `${item.activeClass} font-bold text-[#1f1f1f] dark:text-[#e3e3e3]`
                                : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6] hover:border-black/20 dark:hover:border-white/20'
                            }`}
                          >
                            <img
                              src={item.icon}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 object-contain rounded-lg shrink-0 bg-white p-0.5"
                            />
                            <div className="text-left leading-tight min-w-0">
                              <span className="block text-xs sm:text-sm font-bold truncate">
                                {item.name}
                              </span>
                              <span className="block text-[10px] text-[#444746] dark:text-[#9aa0a6]">
                                {item.bangla}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Merchant / Personal Number Copy Card */}
                  <div className="rounded-2xl bg-white dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-[#444746] dark:text-[#9aa0a6]">
                        নিচের{' '}
                        <strong className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                          {activeGateway.bangla} ({activeGateway.name})
                        </strong>{' '}
                        পার্সোনাল নম্বরে{' '}
                        <strong className="font-bold text-[#1f1f1f] dark:text-[#e3e3e3] tabular-nums">
                          {formattedAmount}
                        </strong>{' '}
                        Send Money করুন:
                      </p>
                      <p
                        data-testid="checkout-merchant-number"
                        className="text-2xl sm:text-[28px] font-bold font-mono tracking-wider tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3] select-all"
                      >
                        {activeMerchantNumber}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyMerchant}
                      data-testid="checkout-copy-number-btn"
                      className={`h-11 px-5 rounded-full border text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        copied
                          ? 'bg-emerald-500/12 border-emerald-500/35 text-emerald-700 dark:text-emerald-400'
                          : 'bg-[#1f1f1f] dark:bg-[#e3e3e3] border-transparent text-white dark:text-[#131314] hover:opacity-90'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>Copy Number</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Clear Bengali Step-by-Step Guide */}
                  <div
                    data-testid="checkout-steps-guide"
                    className="rounded-2xl bg-white dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 space-y-3.5"
                  >
                    <h3 className="text-xs sm:text-sm font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                      {activeGateway.bangla} দিয়ে পেমেন্ট করার সহজ নিয়ম
                    </h3>
                    <ol className="space-y-3">
                      <li className="flex items-start gap-3 text-xs sm:text-[13.5px] text-[#444746] dark:text-[#c4c7c5] leading-[1.7]">
                        <span className="w-6 h-6 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.1] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                          ১
                        </span>
                        <span>
                          আপনার{' '}
                          <strong className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                            {activeGateway.bangla} অ্যাপ
                          </strong>{' '}
                          খুলুন অথবা{' '}
                          <strong className="font-mono font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                            {activeGateway.ussd}
                          </strong>{' '}
                          ডায়াল করে{' '}
                          <strong className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                            Send Money
                          </strong>{' '}
                          অপশনে যান।
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-xs sm:text-[13.5px] text-[#444746] dark:text-[#c4c7c5] leading-[1.7]">
                        <span className="w-6 h-6 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.1] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                          ২
                        </span>
                        <span>
                          উপরের নম্বরটি (
                          <strong className="font-mono font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                            {activeMerchantNumber}
                          </strong>
                          ) কপি করে ঠিক{' '}
                          <strong className="font-bold text-[#1f1f1f] dark:text-[#e3e3e3] tabular-nums">
                            {formattedAmount}
                          </strong>{' '}
                          টাকা সেন্ড মানি সম্পন্ন করুন।
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-xs sm:text-[13.5px] text-[#444746] dark:text-[#c4c7c5] leading-[1.7]">
                        <span className="w-6 h-6 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.1] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                          ৩
                        </span>
                        <span>
                          টাকা পাঠানোর পর SMS-এ পাওয়া{' '}
                          <strong className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                            Transaction ID (TrxID)
                          </strong>{' '}
                          ও আপনার সেন্ডার নম্বরটি ডানপাশের ফর্মে দিয়ে সাবমিট করুন।
                        </span>
                      </li>
                    </ol>
                  </div>

                  {/* Subtle Tutorial Helper inside Left Column */}
                  <div className="rounded-2xl bg-white/80 dark:bg-[#131314]/80 border border-black/[0.08] dark:border-white/[0.08] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs sm:text-[13px] text-[#444746] dark:text-[#9aa0a6] text-center sm:text-left">
                      ভিডিও দেখে সহজে পেমেন্ট করতে চান?
                    </span>
                    <WatchTutorialButton
                      variant="outline"
                      size="sm"
                      alwaysShow
                      label="পেমেন্ট করতে সমস্যা হচ্ছে? ভিডিও দেখুন"
                      testId="checkout-tutorial-left"
                    />
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN: Order Summary Card + Spacious Verification Form */}
              <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
                {/* 1. Order Summary Card */}
                <section
                  aria-label="অর্ডার সামারি"
                  data-testid="checkout-order-summary"
                  className="rounded-3xl bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-5 space-y-3.5"
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-black/[0.08] dark:border-white/[0.08]">
                    <h2 className="text-base font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                      অর্ডার সামারি
                    </h2>
                    <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {selectedPlan === 'yearly' ? 'Save ৳2,389' : '53% OFF'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs sm:text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#444746] dark:text-[#9aa0a6]">নির্বাচিত প্ল্যান</span>
                      <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] text-right">
                        {banglaPlanTitle}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#444746] dark:text-[#9aa0a6]">মেয়াদ</span>
                      <span className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                        {validityLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#444746] dark:text-[#9aa0a6]">টোকেন কোটা</span>
                      <span className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3] tabular-nums">
                        {tokenQuotaLabel}
                      </span>
                    </div>
                  </div>

                  {/* Included Benefits */}
                  <ul className="pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08] space-y-1.5">
                    {PLAN_BENEFITS[selectedPlan].map((benefit) => (
                      <li
                        key={benefit}
                        className="flex items-start gap-2 text-xs text-[#444746] dark:text-[#c4c7c5] leading-snug"
                      >
                        <Check
                          className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 stroke-[2.75]"
                          aria-hidden="true"
                        />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Total Payable */}
                  <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.08] flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                      মোট পরিশোধযোগ্য
                    </span>
                    <div className="text-right">
                      <span
                        data-testid="checkout-total-payable"
                        className="text-2xl font-bold tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]"
                      >
                        {formattedAmount}
                      </span>
                      <span className="block text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                        {activeGateway.name} Send Money
                      </span>
                    </div>
                  </div>
                </section>

                {/* 2. Verification Form */}
                <section
                  aria-label="পেমেন্ট ভেরিফিকেশন ফর্ম"
                  className="rounded-3xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-5 sm:p-6 space-y-4"
                >
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                      ০৩. পেমেন্ট ভেরিফিকেশন তথ্য দিন
                    </h2>
                    <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-relaxed">
                      টাকা পাঠানোর পর আপনার নম্বর ও TrxID সাবমিট করলেই ভেরিফিকেশন শুরু হয়ে যাবে।
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4" data-testid="checkout-form">
                    {error && (
                      <div
                        role="alert"
                        className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 rounded-xl flex items-start gap-2"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="leading-relaxed">{error}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label
                        htmlFor="checkout-sender-mobile"
                        className="block text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]"
                      >
                        Sender Mobile Number ({activeGateway.bangla} নম্বর) *
                      </label>
                      <input
                        id="checkout-sender-mobile"
                        type="tel"
                        required
                        value={senderNumber}
                        onChange={(e) => setSenderNumber(e.target.value)}
                        placeholder="017XXXXXXXX"
                        data-testid="checkout-sender-input"
                        className="w-full h-11 px-3.5 text-sm rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="checkout-trx-id"
                        className="block text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]"
                      >
                        Transaction ID (SMS TrxID) *
                      </label>
                      <input
                        id="checkout-trx-id"
                        type="text"
                        required
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value)}
                        placeholder="e.g. BKB879201X"
                        data-testid="checkout-trxid-input"
                        className="w-full h-11 px-3.5 text-sm rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono uppercase focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                      />
                    </div>

                    {!isAuthenticated && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="checkout-guest-email"
                          className="block text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]"
                        >
                          Email Address{' '}
                          <span className="font-normal text-[#444746] dark:text-[#9aa0a6]">
                            (ঐচ্ছিক — অ্যাকাউন্ট ও রসিদের জন্য)
                          </span>
                        </label>
                        <input
                          id="checkout-guest-email"
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="you@gmail.com"
                          data-testid="checkout-email-input"
                          className="w-full h-11 px-3.5 text-sm rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                        />
                      </div>
                    )}

                    {/* Primary Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      data-testid="checkout-submit-btn"
                      className="btn-pill-primary w-full !min-h-[48px] !h-12 !text-sm !font-semibold !justify-center disabled:opacity-70"
                    >
                      {submitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white dark:border-[#131314] border-t-transparent rounded-full animate-spin shrink-0" />
                          <span>ভেরিফিকেশন সাবমিট হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>Submit Payment &amp; Verification</span>
                          <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                        </>
                      )}
                    </button>

                    {/* Subtle Tutorial Button Directly Beneath Submit */}
                    <div className="flex justify-center pt-0.5">
                      <WatchTutorialButton
                        variant="ghost"
                        size="sm"
                        alwaysShow
                        label="পেমেন্ট করতে সমস্যা হচ্ছে? ভিডিও দেখুন"
                        testId="checkout-tutorial-below-submit"
                      />
                    </div>
                  </form>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
