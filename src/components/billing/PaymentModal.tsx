import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  ArrowRight,
  AlertCircle,
  Clock,
  Lock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { PLANS, formatBDT } from '../../utils/billing.ts';
import {
  getMfsPaymentGuide,
  isValidBdPhoneNumber,
  isValidEmailAddress,
  normalizeBdPhoneNumber,
  resolveActiveMfsGateway,
  resolveEnabledMfsGateways
} from '../../utils/expressCheckout.ts';
import { trackMetaInitiateCheckout, trackMetaAddPaymentInfo } from '../../utils/metaPixel.ts';
import { WatchTutorialButton } from '../common/WatchTutorialButton.tsx';
import { shouldShowTutorialCta } from '../../utils/tutorial.ts';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: 'monthly' | 'yearly';
  onSuccessRedirectToChat?: () => void;
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

const MFS_GATEWAYS = [
  {
    id: 'bkash' as const,
    name: 'bKash',
    bangla: 'বিকাশ',
    icon: 'https://bongotopup.com/wp-content/uploads/2026/01/bkash-icon.png',
    activeClass: 'border-[#E2136E] ring-1 ring-[#E2136E]/40 bg-[#E2136E]/[0.06] dark:bg-[#E2136E]/[0.14]'
  },
  {
    id: 'nagad' as const,
    name: 'Nagad',
    bangla: 'নগদ',
    icon: 'https://bongotopup.com/wp-content/uploads/2026/01/nagad-icon1.png',
    activeClass: 'border-[#F7941D] ring-1 ring-[#F7941D]/40 bg-[#F7941D]/[0.06] dark:bg-[#F7941D]/[0.14]'
  },
  {
    id: 'rocket' as const,
    name: 'Rocket',
    bangla: 'রকেট',
    icon: 'https://bongotopup.com/wp-content/uploads/2026/01/rocket-icon-removebg-preview.png',
    activeClass: 'border-[#8C3494] ring-1 ring-[#8C3494]/40 bg-[#8C3494]/[0.06] dark:bg-[#8C3494]/[0.14]'
  }
];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  defaultPlan = 'monthly',
  onSuccessRedirectToChat
}) => {
  const { user, token, loading: authLoading, refreshUser, applySession, openAuthModal } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(defaultPlan);
  const [gateway, setGateway] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [senderNumber, setSenderNumber] = useState(user?.phone || '');
  const [guestEmail, setGuestEmail] = useState('');
  const [trxId, setTrxId] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
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
    rocket_enabled: true
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const plan = PLANS[selectedPlan];
  const isAuthenticated = Boolean(user && token);
  const enabledGatewayIds = resolveEnabledMfsGateways(paymentSettings);
  const visibleGateways = MFS_GATEWAYS.filter(item => enabledGatewayIds.includes(item.id));

  useEffect(() => {
    if (isOpen) {
      setSelectedPlan(defaultPlan);
    }
  }, [isOpen, defaultPlan]);

  useEffect(() => {
    if (isOpen) {
      setSubmittedPayment(null);
      setError(null);
      setTrxId('');
      setQuickPassword('');
      setPasswordSaved(false);
      setPasswordError(null);
      setSettingsLoaded(false);

      trackMetaInitiateCheckout(plan.name, plan.priceBDT);

      fetch('/api/payment/settings', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data && data.bkash_number) {
            const nextSettings: PaymentSettings = {
              bkash_number: data.bkash_number,
              nagad_number: data.nagad_number,
              rocket_number: data.rocket_number,
              bkash_enabled: data.bkash_enabled !== false,
              nagad_enabled: data.nagad_enabled !== false,
              rocket_enabled: data.rocket_enabled !== false
            };
            setPaymentSettings(nextSettings);
            const activeIds = resolveEnabledMfsGateways(nextSettings);
            setGateway(prev => resolveActiveMfsGateway(activeIds, prev));
          }
        })
        .catch(err => console.error('Failed to load payment numbers:', err))
        .finally(() => setSettingsLoaded(true));
    }
  }, [isOpen, selectedPlan]);

  useEffect(() => {
    if (enabledGatewayIds.length > 0 && !enabledGatewayIds.includes(gateway)) {
      setGateway(resolveActiveMfsGateway(enabledGatewayIds, gateway));
    }
  }, [enabledGatewayIds.join(','), gateway]);

  useEffect(() => {
    if (user?.phone && !senderNumber) {
      setSenderNumber(user.phone);
    }
  }, [user, senderNumber]);

  if (!isOpen) return null;

  const activeGateway = visibleGateways.find(g => g.id === gateway) || visibleGateways[0] || MFS_GATEWAYS[0];

  const activeMerchantNumber =
    gateway === 'bkash' ? paymentSettings.bkash_number :
    gateway === 'nagad' ? paymentSettings.nagad_number :
    paymentSettings.rocket_number;

  const paymentGuide = getMfsPaymentGuide({
    gateway,
    amountText: formatBDT(plan.priceBDT),
    merchantNumber: activeMerchantNumber,
  });

  const handleCopyMerchant = () => {
    navigator.clipboard.writeText(activeMerchantNumber.replace(/[^0-9]/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTrx = trxId.trim().toUpperCase();
    if (!cleanTrx || cleanTrx.length < 6) {
      setError('Please enter a valid MFS Transaction ID (TrxID) from your SMS.');
      return;
    }

    const cleanSender = normalizeBdPhoneNumber(senderNumber);
    if (!isValidBdPhoneNumber(cleanSender)) {
      setError('Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).');
      return;
    }

    const trimmedEmail = guestEmail.trim().toLowerCase();
    if (!isAuthenticated && trimmedEmail && !isValidEmailAddress(trimmedEmail)) {
      setError('Please enter a valid email address or leave the email field blank.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const endpoint = isAuthenticated ? '/api/payments/verify' : '/api/payments/express';
      const minDelay = new Promise(resolve => setTimeout(resolve, 1200));
      const fetchPromise = fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAuthenticated && token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(
          isAuthenticated
            ? {
                planId: selectedPlan,
                gateway,
                senderNumber: cleanSender,
                trxId: cleanTrx
              }
            : {
                planId: selectedPlan,
                gateway,
                senderNumber: cleanSender,
                trxId: cleanTrx,
                ...(trimmedEmail ? { email: trimmedEmail } : {})
              }
        )
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
        receiptEmail: trimmedEmail || (user?.email && !user.email.endsWith('@phone.bangla-ai.pro') ? user.email : undefined)
      });
    } catch (err: any) {
      setError(err.message || 'Payment processing error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuickPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeToken = token || localStorage.getItem('bangla_ai_token');
    if (!activeToken) return;
    if (quickPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ newPassword: quickPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not save password.');
      }
      setPasswordSaved(true);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to save password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div
        role="dialog"
        aria-modal="true"
        data-testid="payment-modal"
        className="relative w-full max-w-md bg-white dark:bg-[#1e1f20] rounded-3xl shadow-xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden flex flex-col max-h-[92vh]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] transition-colors z-10 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
          {submittedPayment ? (
            /* Confirmation Receipt Card */
            <div className="space-y-4 text-center py-2 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <Clock className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block">
                  {submittedPayment.autoAuthenticated
                    ? 'Order Received • Account Auto-Signed In'
                    : 'Payment Submitted • Awaiting Verification'}
                </span>
                <h2 className="text-xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Verification Pending
                </h2>
                <p className="text-xs text-[#444746] dark:text-[#9aa0a6] max-w-sm mx-auto leading-relaxed">
                  {submittedPayment.receiptEmail
                    ? `We sent a confirmation to ${submittedPayment.receiptEmail} and will unlock Pro access as soon as your TrxID is verified.`
                    : 'We received your TrxID! An administrator will verify it shortly and unlock your Pro access.'}
                </p>
              </div>

              <div className="bg-[#f0f4f9] dark:bg-[#131314] rounded-2xl p-3.5 border border-black/[0.08] dark:border-white/[0.08] text-xs space-y-2 text-left">
                <div className="flex justify-between items-center gap-2 py-0.5 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[#444746] dark:text-[#9aa0a6]">Plan:</span>
                  <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">{submittedPayment.planName}</span>
                </div>
                <div className="flex justify-between items-center gap-2 py-0.5 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[#444746] dark:text-[#9aa0a6]">Amount &amp; Method:</span>
                  <span className="font-semibold font-mono text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {formatBDT(submittedPayment.amount)} · {submittedPayment.gateway.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2 py-0.5 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[#444746] dark:text-[#9aa0a6]">Mobile Number:</span>
                  <span className="font-semibold font-mono text-[#1f1f1f] dark:text-[#e3e3e3]">{submittedPayment.senderNumber}</span>
                </div>
                <div className="flex justify-between items-center gap-2 py-0.5">
                  <span className="text-[#444746] dark:text-[#9aa0a6]">Transaction ID:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono tracking-wider break-all">
                    {submittedPayment.trxId}
                  </span>
                </div>
              </div>

              {/* Optional 1-line Password Setup for Brand-New Express Users */}
              {submittedPayment.autoAuthenticated && (
                <form
                  onSubmit={handleSaveQuickPassword}
                  className="bg-[#f0f4f9] dark:bg-[#131314] rounded-2xl p-3 border border-black/[0.08] dark:border-white/[0.08] text-left space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-[#444746] dark:text-[#9aa0a6]" />
                      <span>Set a login password (optional)</span>
                    </span>
                    {passwordSaved && (
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        Saved ✓
                      </span>
                    )}
                  </div>
                  {!passwordSaved && (
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={quickPassword}
                        onChange={e => setQuickPassword(e.target.value)}
                        placeholder="Min 6 chars (sign in later with phone/email)"
                        className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                      />
                      <button
                        type="submit"
                        disabled={savingPassword || quickPassword.length < 6}
                        className="h-8 px-3.5 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[11px] font-semibold shrink-0 disabled:opacity-50 cursor-pointer"
                      >
                        {savingPassword ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                  {passwordError && (
                    <p className="text-[11px] text-red-600 dark:text-red-400">{passwordError}</p>
                  )}
                </form>
              )}

              {submittedPayment.accountExistsNotice && !isAuthenticated && (
                <div className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                  An account already exists with these details.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openAuthModal('login');
                    }}
                    className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] underline cursor-pointer"
                  >
                    Sign In to view status
                  </button>
                </div>
              )}

              <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto h-10 px-6 rounded-full font-semibold text-xs text-white dark:text-[#131314] bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 transition-colors cursor-pointer"
                >
                  Done
                </button>
                {onSuccessRedirectToChat && isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSuccessRedirectToChat();
                    }}
                    className="w-full sm:w-auto h-10 px-5 rounded-full font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3] border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] transition-colors cursor-pointer"
                  >
                    Go to Workspace
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Compact Header */}
              <div className="pr-7 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
                    {isAuthenticated ? (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Signed In · {user?.email?.endsWith('@phone.bangla-ai.pro') ? user.phone : user?.email}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Express Checkout · No Sign-Up Required</span>
                      </>
                    )}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
                  {isAuthenticated ? 'Activate Pro Subscription' : 'Instant MFS Checkout'}
                </h2>
              </div>

              {/* Compact 1-Row Plan Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlan('monthly')}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
                    selectedPlan === 'monthly'
                      ? 'border-[#1f1f1f] dark:border-[#e3e3e3] bg-[#e9eef6] dark:bg-[#282a2c] ring-1 ring-[#1f1f1f] dark:ring-[#e3e3e3]'
                      : 'border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9]/60 dark:bg-[#131314]/60 hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">Monthly</span>
                    <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">1M tokens</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold font-mono text-[#1f1f1f] dark:text-[#e3e3e3] mt-0.5">
                    {formatBDT(PLANS.monthly.priceBDT)}
                    <span className="text-[10px] font-normal text-[#444746] dark:text-[#9aa0a6]">/mo</span>
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlan('yearly')}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-colors relative cursor-pointer ${
                    selectedPlan === 'yearly'
                      ? 'border-[#1f1f1f] dark:border-[#e3e3e3] bg-[#e9eef6] dark:bg-[#282a2c] ring-1 ring-[#1f1f1f] dark:ring-[#e3e3e3]'
                      : 'border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9]/60 dark:bg-[#131314]/60 hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
                  }`}
                >
                  <span className="absolute -top-2 right-2 bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                    SAVE 28%
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">Yearly</span>
                    <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">15M tokens</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold font-mono text-[#1f1f1f] dark:text-[#e3e3e3] mt-0.5">
                    {formatBDT(PLANS.yearly.priceBDT)}
                    <span className="text-[10px] font-normal text-[#444746] dark:text-[#9aa0a6]">/yr</span>
                  </p>
                </button>
              </div>

              {/* Compact Gateway Tabs + Clean Merchant Send Money Card */}
              <div className="bg-[#f0f4f9] dark:bg-[#131314] rounded-2xl p-3 border border-black/[0.08] dark:border-white/[0.08] space-y-2.5">
                {!settingsLoaded ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="h-[34px] rounded-xl bg-white/70 dark:bg-[#1e1f20]/70 animate-pulse" />
                    <div className="h-[34px] rounded-xl bg-white/70 dark:bg-[#1e1f20]/70 animate-pulse" />
                  </div>
                ) : (
                  <div
                    data-testid="mfs-gateway-selector"
                    className={`grid gap-1.5 ${
                      visibleGateways.length <= 1
                        ? 'grid-cols-1'
                        : visibleGateways.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-3'
                    }`}
                  >
                    {visibleGateways.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`mfs-gateway-btn-${item.id}`}
                        onClick={() => setGateway(item.id)}
                        className={`py-1.5 px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-w-0 ${
                          gateway === item.id
                            ? `${item.activeClass} font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]`
                            : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#444746] dark:text-[#9aa0a6] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c]'
                        }`}
                      >
                        <img
                          src={item.icon}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 object-contain rounded shrink-0 bg-white p-0.5"
                        />
                        <span className="text-xs font-semibold truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="bg-white dark:bg-[#1e1f20] rounded-xl px-3 py-2.5 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block">
                      Send Money <strong className="text-[#1f1f1f] dark:text-[#e3e3e3] font-mono">{formatBDT(plan.priceBDT)}</strong> to {activeGateway.name}:
                    </span>
                    <p className="text-lg sm:text-xl font-bold font-mono tracking-wider text-[#1f1f1f] dark:text-[#e3e3e3] select-all leading-tight mt-0.5">
                      {activeMerchantNumber}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyMerchant}
                    className={`shrink-0 h-8 px-3 text-xs rounded-full border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      copied
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-[#f0f4f9] dark:bg-[#282a2c] border-black/[0.08] dark:border-white/[0.1] text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#e9eef6] dark:hover:bg-[#333537]'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div
                  data-testid="payment-instructions-steps"
                  className="bg-white/75 dark:bg-[#1e1f20]/80 rounded-xl px-3 py-2.5 border border-black/[0.06] dark:border-white/[0.06] space-y-1.5"
                >
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
                    How to pay via {paymentGuide.gatewayName}
                  </p>
                  <ol className="space-y-1.5">
                    {paymentGuide.stepSegments.map((segments, index) => (
                      <li
                        key={paymentGuide.steps[index]}
                        className="flex items-start gap-2 text-[11px] leading-snug text-[#444746] dark:text-[#c4c7c5]"
                      >
                        <span className="w-4 h-4 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-[10px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span>
                          {segments.map((seg, segIdx) =>
                            seg.bold ? (
                              <strong
                                key={segIdx}
                                className={`font-bold text-[#1f1f1f] dark:text-[#e3e3e3] ${seg.mono ? 'font-mono' : ''}`}
                              >
                                {seg.text}
                              </strong>
                            ) : (
                              <React.Fragment key={segIdx}>{seg.text}</React.Fragment>
                            )
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Clean Streamlined Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                  <div className="p-2.5 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
                      Sender Mobile *
                    </label>
                    <input
                      type="tel"
                      required
                      value={senderNumber}
                      onChange={e => setSenderNumber(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
                      SMS TrxID *
                    </label>
                    <input
                      type="text"
                      required
                      value={trxId}
                      onChange={e => setTrxId(e.target.value)}
                      placeholder="e.g. BKB879201X"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono uppercase focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                    />
                  </div>
                </div>

                {!isAuthenticated && (
                  <div>
                    <label className="block text-[11px] font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
                      Email for Account Creation <span className="text-[#444746] dark:text-[#9aa0a6] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      placeholder="you@gmail.com (for your account & receipt)"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  data-testid="payment-submit-btn"
                  className="w-full h-11 px-5 rounded-full font-semibold text-xs text-white dark:text-[#131314] bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white dark:border-[#131314] border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Order...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {isAuthenticated
                          ? 'Submit Payment for Verification'
                          : 'Complete Order & Auto Sign In'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {shouldShowTutorialCta({
                  user,
                  loading: authLoading,
                  hasStoredToken: Boolean(token),
                }) && (
                  <div className="flex justify-center pt-0.5">
                    <WatchTutorialButton
                      variant="ghost"
                      size="sm"
                      testId="tutorial-btn-payment"
                    />
                  </div>
                )}

                {!isAuthenticated && (
                  <p className="text-center text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        openAuthModal('login');
                      }}
                      className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
