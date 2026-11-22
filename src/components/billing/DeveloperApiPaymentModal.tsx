import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock,
  Copy,
  Key,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { DEVELOPER_API_ADDON, formatBDT } from '../../utils/billing.ts';
import {
  getMfsPaymentGuide,
  isValidBdPhoneNumber,
  normalizeBdPhoneNumber,
  resolveActiveMfsGateway,
  resolveEnabledMfsGateways,
} from '../../utils/expressCheckout.ts';
import {
  generateMetaEventId,
  getMetaBrowserAttribution,
  trackMetaAddPaymentInfo,
  trackMetaInitiateCheckout,
} from '../../utils/metaPixel.ts';
import type { DeveloperApiBillingStatus, DeveloperApiDefaults } from '../../types/index.ts';

interface DeveloperApiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  billing: DeveloperApiBillingStatus;
  defaults: DeveloperApiDefaults;
  requestedKeyName?: string;
  onSubmitted?: () => void;
  onOpenSubscriptionCheckout?: () => void;
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
  receiptEmail?: string;
}

const MFS_GATEWAYS = [
  {
    id: 'bkash' as const,
    name: 'bKash',
    bangla: 'বিকাশ',
    icon: 'https://bongotopup.com/wp-content/uploads/2026/01/bkash-icon.png',
    activeClass:
      'border-[#E2136E] ring-1 ring-[#E2136E]/40 bg-[#E2136E]/[0.06] dark:bg-[#E2136E]/[0.14]',
  },
  {
    id: 'nagad' as const,
    name: 'Nagad',
    bangla: 'নগদ',
    icon: 'https://bongotopup.com/wp-content/uploads/2026/01/nagad-icon1.png',
    activeClass:
      'border-[#F7941D] ring-1 ring-[#F7941D]/40 bg-[#F7941D]/[0.06] dark:bg-[#F7941D]/[0.14]',
  },
  {
    id: 'rocket' as const,
    name: 'Rocket',
    bangla: 'রকেট',
    icon: 'https://bongotopup.com/wp-content/uploads/2026/01/rocket-icon-removebg-preview.png',
    activeClass:
      'border-[#8C3494] ring-1 ring-[#8C3494]/40 bg-[#8C3494]/[0.06] dark:bg-[#8C3494]/[0.14]',
  },
];

export const DeveloperApiPaymentModal: React.FC<DeveloperApiPaymentModalProps> = ({
  isOpen,
  onClose,
  billing,
  requestedKeyName,
  onSubmitted,
  onOpenSubscriptionCheckout,
}) => {
  const { user, token, refreshUser } = useAuth();
  const [gateway, setGateway] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [senderNumber, setSenderNumber] = useState(user?.phone || '');
  const [trxId, setTrxId] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedPayment, setSubmittedPayment] = useState<SubmittedState | null>(null);

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    bkash_number: '01812345678',
    nagad_number: '01712345678',
    rocket_number: '01912345678',
    bkash_enabled: true,
    nagad_enabled: true,
    rocket_enabled: true,
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const priceBdt = billing.priceBdt || DEVELOPER_API_ADDON.priceBDT;
  const enabledGatewayIds = resolveEnabledMfsGateways(paymentSettings);
  const visibleGateways = MFS_GATEWAYS.filter((item) => enabledGatewayIds.includes(item.id));
  const trackedCheckoutOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      trackedCheckoutOpenRef.current = false;
      return;
    }

    setSubmittedPayment(null);
    setError(null);
    setTrxId('');
    setSettingsLoaded(false);

    if (billing.hasActiveSubscription && !trackedCheckoutOpenRef.current) {
      trackedCheckoutOpenRef.current = true;
      trackMetaInitiateCheckout(DEVELOPER_API_ADDON.name, priceBdt);
    }

    fetch('/api/payment/settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
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
      .finally(() => setSettingsLoaded(true));
  }, [isOpen, billing.hasActiveSubscription, priceBdt]);

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

  const activeGateway =
    visibleGateways.find((g) => g.id === gateway) || visibleGateways[0] || MFS_GATEWAYS[0];

  const activeMerchantNumber =
    gateway === 'bkash'
      ? paymentSettings.bkash_number
      : gateway === 'nagad'
      ? paymentSettings.nagad_number
      : paymentSettings.rocket_number;

  const paymentGuide = getMfsPaymentGuide({
    gateway,
    amountText: formatBDT(priceBdt),
    merchantNumber: activeMerchantNumber,
  });

  const handleCopyMerchant = () => {
    navigator.clipboard.writeText(activeMerchantNumber.replace(/[^0-9]/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !token) return;

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

    setError(null);
    setLoading(true);

    try {
      const addPaymentInfoEventId = generateMetaEventId('add_payment_info');
      const metaAttribution = {
        ...getMetaBrowserAttribution(),
        addPaymentInfoEventId,
      };
      const minDelay = new Promise((resolve) => setTimeout(resolve, 1000));
      const fetchPromise = fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: 'developer_api',
          gateway,
          senderNumber: cleanSender,
          trxId: cleanTrx,
          meta: metaAttribution,
        }),
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

      trackMetaAddPaymentInfo(DEVELOPER_API_ADDON.name, priceBdt, gateway, addPaymentInfoEventId);
      await refreshUser();
      onSubmitted?.();

      setSubmittedPayment({
        trxId: cleanTrx,
        gateway,
        senderNumber: cleanSender,
        amount: priceBdt,
        planName: DEVELOPER_API_ADDON.name,
        receiptEmail:
          user?.email && !user.email.endsWith('@phone.bangla-ai.pro') ? user.email : undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Payment processing error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs animate-in fade-in">
      <div
        role="dialog"
        aria-modal="true"
        data-testid="developer-api-payment-modal"
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
          {!billing.hasActiveSubscription ? (
            /* Gate: Active Monthly or Yearly Subscription Required First */
            <div
              data-testid="developer-api-subscription-required-modal"
              className="space-y-4 text-center py-3 animate-in fade-in"
            >
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                <Lock className="w-5 h-5" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold block">
                  Pro Subscription Required
                </span>
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Monthly or Yearly Plan Needed First
                </h2>
                <p className="text-xs text-[#444746] dark:text-[#9aa0a6] max-w-sm mx-auto leading-relaxed">
                  Developer API keys cannot be purchased standalone. Please activate a{' '}
                  <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Monthly</strong> or{' '}
                  <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Yearly</strong> subscription
                  first, then unlock API key creation for{' '}
                  <strong className="font-mono text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {formatBDT(priceBdt)}
                  </strong>
                  .
                </p>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5 justify-center">
                {onOpenSubscriptionCheckout && (
                  <button
                    type="button"
                    data-testid="developer-api-upgrade-sub-btn"
                    onClick={() => {
                      onClose();
                      onOpenSubscriptionCheckout();
                    }}
                    className="w-full sm:w-auto h-10 px-6 rounded-full font-semibold text-xs text-white dark:text-[#131314] bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Activate Monthly / Yearly Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto h-10 px-5 rounded-full font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3] border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : submittedPayment ? (
            /* Confirmation Receipt Card (Matches Subscription PaymentModal) */
            <div
              data-testid="developer-api-payment-submitted"
              className="space-y-4 text-center py-2 animate-in fade-in"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <Clock className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block">
                  Payment Submitted • Awaiting Verification
                </span>
                <h2 className="text-xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Verification Pending
                </h2>
                <p className="text-xs text-[#444746] dark:text-[#9aa0a6] max-w-sm mx-auto leading-relaxed">
                  {submittedPayment.receiptEmail
                    ? `We received your ${formatBDT(submittedPayment.amount)} TrxID and sent a confirmation to ${submittedPayment.receiptEmail}. Once an admin approves it, your API key creation slot will unlock immediately.`
                    : `We received your ${formatBDT(submittedPayment.amount)} TrxID! Once an administrator approves it, you can immediately generate your API key.`}
                </p>
              </div>

              <div className="bg-[#f0f4f9] dark:bg-[#131314] rounded-2xl p-3.5 border border-black/[0.08] dark:border-white/[0.08] text-xs space-y-2 text-left">
                <div className="flex justify-between items-center gap-2 py-0.5 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[#444746] dark:text-[#9aa0a6]">Add-on:</span>
                  <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {submittedPayment.planName}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2 py-0.5 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[#444746] dark:text-[#9aa0a6]">Amount &amp; Method:</span>
                  <span className="font-semibold font-mono text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {formatBDT(submittedPayment.amount)} · {submittedPayment.gateway.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2 py-0.5 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-[#444746] dark:text-[#9aa0a6]">Mobile Number:</span>
                  <span className="font-semibold font-mono text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {submittedPayment.senderNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2 py-0.5">
                  <span className="text-[#444746] dark:text-[#9aa0a6]">Transaction ID:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono tracking-wider break-all">
                    {submittedPayment.trxId}
                  </span>
                </div>
              </div>

              <div className="pt-1 flex justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto h-10 px-6 rounded-full font-semibold text-xs text-white dark:text-[#131314] bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ৳399 Developer API Checkout Popup (Same Layout & Flow as Subscription PaymentModal) */
            <>
              {/* Compact Header */}
              <div className="pr-7 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.08] dark:border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {billing.activePlanName || 'Active Pro Plan'} ·{' '}
                      {user?.email?.endsWith('@phone.bangla-ai.pro') ? user.phone : user?.email}
                    </span>
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Activate Developer API Key
                </h2>
              </div>

              {/* Single Add-on Pricing Card (৳399) */}
              <div className="p-3 rounded-2xl border border-[#1f1f1f] dark:border-[#e3e3e3] bg-[#e9eef6] dark:bg-[#282a2c] ring-1 ring-[#1f1f1f] dark:ring-[#e3e3e3] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                    <Key className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {requestedKeyName?.trim()
                        ? `API Key: ${requestedKeyName.trim()}`
                        : DEVELOPER_API_ADDON.name}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    data-testid="developer-api-modal-price"
                    className="text-lg sm:text-xl font-bold font-mono text-[#1f1f1f] dark:text-[#e3e3e3]"
                  >
                    {formatBDT(priceBdt)}
                  </p>
                  <span className="text-[10px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                    add-on fee
                  </span>
                </div>
              </div>

              {/* Compact Gateway Tabs + Merchant Send Money Card */}
              <div className="bg-[#f0f4f9] dark:bg-[#131314] rounded-2xl p-3 border border-black/[0.08] dark:border-white/[0.08] space-y-2.5">
                {!settingsLoaded ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="h-[34px] rounded-xl bg-white/70 dark:bg-[#1e1f20]/70 animate-pulse" />
                    <div className="h-[34px] rounded-xl bg-white/70 dark:bg-[#1e1f20]/70 animate-pulse" />
                  </div>
                ) : (
                  <div
                    data-testid="dev-api-mfs-gateway-selector"
                    className={`grid gap-1.5 ${
                      visibleGateways.length <= 1
                        ? 'grid-cols-1'
                        : visibleGateways.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-3'
                    }`}
                  >
                    {visibleGateways.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`dev-api-mfs-gateway-btn-${item.id}`}
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
                      Send Money{' '}
                      <strong className="text-[#1f1f1f] dark:text-[#e3e3e3] font-mono">
                        {formatBDT(priceBdt)}
                      </strong>{' '}
                      to {activeGateway.name}:
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
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                    )}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div
                  data-testid="dev-api-payment-instructions-steps"
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
                                className={`font-bold text-[#1f1f1f] dark:text-[#e3e3e3] ${
                                  seg.mono ? 'font-mono' : ''
                                }`}
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

              {/* Verification Form */}
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
                      onChange={(e) => setSenderNumber(e.target.value)}
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
                      onChange={(e) => setTrxId(e.target.value)}
                      placeholder="e.g. BKB879201X"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono uppercase focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  data-testid="developer-api-payment-submit-btn"
                  className="w-full h-11 px-5 rounded-full font-semibold text-xs text-white dark:text-[#131314] bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white dark:border-[#131314] border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Payment...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Submit {formatBDT(priceBdt)} Payment for Verification</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
