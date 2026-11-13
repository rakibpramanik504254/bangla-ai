import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Copy, Check, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { PLANS, formatBDT } from '../../utils/billing.ts';
import { trackMetaInitiateCheckout, trackMetaAddPaymentInfo } from '../../utils/metaPixel.ts';

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
}

interface SubmittedState {
  trxId: string;
  gateway: string;
  senderNumber: string;
  amount: number;
  planName: string;
}

const MFS_GATEWAYS = [
  {
    id: 'bkash' as const,
    name: 'bKash',
    bangla: 'বিকাশ',
    icon: 'https://bongotopup.com/wp-content/uploads/2026/01/bkash-icon.png',
    activeClass: 'border-[#E2136E] ring-1 ring-[#E2136E]/40 bg-[#E2136E]/[0.06] dark:bg-[#E2136E]/[0.14]',
    accentText: 'text-[#E2136E] dark:text-pink-400'
  },
  {
    id: 'nagad' as const,
    name: 'Nagad',
    bangla: 'নগদ',
    icon: 'https://bongotopup.com/wp-content/uploads/2026/01/nagad-icon1.png',
    activeClass: 'border-[#F7941D] ring-1 ring-[#F7941D]/40 bg-[#F7941D]/[0.06] dark:bg-[#F7941D]/[0.14]',
    accentText: 'text-[#F7941D] dark:text-orange-400'
  },
  {
    id: 'rocket' as const,
    name: 'Rocket',
    bangla: 'রকেট',
    icon: 'https://bongotopup.com/wp-content/uploads/2026/01/rocket-icon-removebg-preview.png',
    activeClass: 'border-[#8C3494] ring-1 ring-[#8C3494]/40 bg-[#8C3494]/[0.06] dark:bg-[#8C3494]/[0.14]',
    accentText: 'text-[#8C3494] dark:text-purple-400'
  }
];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  defaultPlan = 'monthly',
  onSuccessRedirectToChat
}) => {
  const { user, token, refreshUser, openAuthModal } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(defaultPlan);
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
    rocket_number: '01912345678'
  });

  const plan = PLANS[selectedPlan];

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

      // Track Meta Pixel InitiateCheckout
      trackMetaInitiateCheckout(plan.name, plan.priceBDT);

      fetch('/api/payment/settings')
        .then(res => res.json())
        .then(data => {
          if (data && data.bkash_number) {
            setPaymentSettings({
              bkash_number: data.bkash_number,
              nagad_number: data.nagad_number,
              rocket_number: data.rocket_number
            });
          }
        })
        .catch(err => console.error('Failed to load payment numbers:', err));
    }
  }, [isOpen, selectedPlan]);

  useEffect(() => {
    if (user?.phone && !senderNumber) {
      setSenderNumber(user.phone);
    }
  }, [user]);

  if (!isOpen) return null;

  const activeGateway = MFS_GATEWAYS.find(g => g.id === gateway) || MFS_GATEWAYS[0];

  const activeMerchantNumber =
    gateway === 'bkash' ? paymentSettings.bkash_number :
    gateway === 'nagad' ? paymentSettings.nagad_number :
    paymentSettings.rocket_number;

  const handleCopyMerchant = () => {
    navigator.clipboard.writeText(activeMerchantNumber.replace(/[^0-9]/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      onClose();
      openAuthModal('login');
      return;
    }

    const cleanTrx = trxId.trim().toUpperCase();
    if (!cleanTrx || cleanTrx.length < 6) {
      setError('Please provide a valid MFS Transaction ID (TrxID) received via SMS.');
      return;
    }

    const cleanSender = senderNumber.trim().replace(/[^0-9]/g, '');
    if (cleanSender.length < 11) {
      setError('Please enter an 11-digit Bangladeshi mobile number (e.g. 01812345678).');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const minDelay = new Promise(resolve => setTimeout(resolve, 3000));
      const fetchPromise = fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: selectedPlan,
          gateway,
          senderNumber: cleanSender,
          trxId: cleanTrx
        })
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

      // Track Meta Pixel AddPaymentInfo
      trackMetaAddPaymentInfo(plan.name, plan.priceBDT, gateway);

      setSubmittedPayment({
        trxId: cleanTrx,
        gateway,
        senderNumber: cleanSender,
        amount: plan.priceBDT,
        planName: plan.name
      });

      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Payment processing error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#262626] rounded-[16px] shadow-2xl border border-black/[0.12] dark:border-white/[0.15] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors z-10 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
          {submittedPayment ? (
            /* Pending Verification Confirmation Card */
            <div className="space-y-6 text-center py-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <Clock className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block">
                  Payment Submitted • Awaiting Verification
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
                  Verification Pending
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Thank you! We have received your payment submission. An administrator will verify the Transaction ID against our MFS statement and activate your access shortly.
                </p>
              </div>

              <div className="bg-[#FAFAFA] dark:bg-[#1F1F1F] rounded-[8px] p-4 border border-black/[0.08] dark:border-white/[0.08] text-xs space-y-2.5 text-left font-mono">
                <div className="flex justify-between items-center py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-gray-500 font-sans">Plan Selected:</span>
                  <span className="font-bold text-black dark:text-white font-sans">{submittedPayment.planName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-gray-500 font-sans">Amount:</span>
                  <span className="font-bold text-black dark:text-white">{formatBDT(submittedPayment.amount)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-gray-500 font-sans">MFS Gateway:</span>
                  <span className="font-bold text-black dark:text-white uppercase font-sans">{submittedPayment.gateway}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-gray-500 font-sans">Sender Mobile:</span>
                  <span className="font-bold text-black dark:text-white">{submittedPayment.senderNumber}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500 font-sans">Transaction ID:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-wider">{submittedPayment.trxId}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto h-11 px-6 rounded-full font-semibold text-xs text-white dark:text-black bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 transition-all cursor-pointer shadow-xs"
                >
                  Close & Return
                </button>
                {onSuccessRedirectToChat && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSuccessRedirectToChat();
                    }}
                    className="w-full sm:w-auto h-11 px-6 rounded-full font-semibold text-xs text-black dark:text-white border border-black/[0.12] dark:border-white/[0.15] hover:border-black/30 transition-colors cursor-pointer"
                  >
                    Go to Workspace
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center">
                <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 block mb-1">
                  Official MFS Payment Verification
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
                  Activate Subscription
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Send BDT via bKash, Nagad, or Rocket and enter your SMS TrxID
                </p>
              </div>

              {/* Plan Selector */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlan('monthly')}
                  className={`p-4 rounded-[8px] border text-left transition-all cursor-pointer ${
                    selectedPlan === 'monthly'
                      ? 'border-black dark:border-white bg-black/[0.02] dark:bg-white/[0.03] ring-1 ring-black dark:ring-white'
                      : 'border-black/[0.08] dark:border-white/[0.08] hover:border-black/30 dark:hover:border-white/30'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-black dark:text-white">Monthly Plan</span>
                    <span className="w-4 h-4 rounded-full border border-black/30 dark:border-white/30 flex items-center justify-center">
                      {selectedPlan === 'monthly' && <span className="w-2 h-2 rounded-full bg-black dark:bg-white" />}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-black dark:text-white mt-1.5 font-mono">
                    {formatBDT(PLANS.monthly.priceBDT)}
                    <span className="text-xs font-normal text-gray-500">/mo</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">30 days • 1,000,000 (1M) tokens</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlan('yearly')}
                  className={`p-4 rounded-[8px] border text-left transition-all relative cursor-pointer ${
                    selectedPlan === 'yearly'
                      ? 'border-black dark:border-white bg-black/[0.02] dark:bg-white/[0.03] ring-1 ring-black dark:ring-white'
                      : 'border-black/[0.08] dark:border-white/[0.08] hover:border-black/30 dark:hover:border-white/30'
                  }`}
                >
                  <span className="absolute -top-2 right-2 bg-black text-white dark:bg-white dark:text-black text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border border-black/10">
                    SAVE 28%
                  </span>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-black dark:text-white">Yearly Plan</span>
                    <span className="w-4 h-4 rounded-full border border-black/30 dark:border-white/30 flex items-center justify-center">
                      {selectedPlan === 'yearly' && <span className="w-2 h-2 rounded-full bg-black dark:bg-white" />}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-black dark:text-white mt-1.5 font-mono">
                    {formatBDT(PLANS.yearly.priceBDT)}
                    <span className="text-xs font-normal text-gray-500">/yr</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">365 days • 15,000,000 (15M) tokens</p>
                </button>
              </div>

              {/* Payment Gateway: bKash, Nagad, Rocket */}
              <div>
                <label className="block text-xs font-semibold text-black dark:text-white mb-2">
                  Select Mobile Financial Service (MFS):
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {MFS_GATEWAYS.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGateway(item.id)}
                      className={`py-2.5 px-2.5 rounded-[12px] border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        gateway === item.id
                          ? `${item.activeClass} font-bold text-black dark:text-white shadow-2xs`
                          : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1F1F1F] text-gray-600 dark:text-gray-400 hover:border-black/30 dark:hover:border-white/30'
                      }`}
                    >
                      <img
                        src={item.icon}
                        alt={item.name}
                        className="w-7 h-7 object-contain rounded-md shrink-0 bg-white p-0.5 shadow-2xs"
                      />
                      <div className="text-left leading-tight">
                        <span className="text-xs font-bold block">{item.name}</span>
                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 block">{item.bangla}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Instructions Box with Prominent Big Number */}
              <div className="bg-[#F8F9FA] dark:bg-[#1F1F1F] rounded-[12px] p-4 border border-black/[0.08] dark:border-white/[0.08] text-xs text-gray-600 dark:text-gray-400 space-y-3.5">
                {/* Highlighted Large Merchant Number Card */}
                <div className="bg-white dark:bg-[#2A2A2A] rounded-[10px] p-3.5 border border-black/[0.08] dark:border-white/[0.1] shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={activeGateway.icon}
                      alt={activeGateway.name}
                      className="w-10 h-10 object-contain rounded-lg bg-white p-1 border border-black/[0.08] shrink-0 shadow-2xs"
                    />
                    <div className="min-w-0">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">
                        Send <strong className="text-black dark:text-white font-mono">{formatBDT(plan.priceBDT)}</strong> to {activeGateway.name}
                      </span>
                      <p className="text-xl sm:text-2xl font-extrabold font-mono tracking-wider text-black dark:text-white mt-0.5 select-all truncate">
                        {activeMerchantNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyMerchant}
                    className={`shrink-0 px-3.5 py-2 text-xs rounded-full border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                      copied
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-[#F8F9FA] dark:bg-[#1F1F1F] border-black/[0.12] dark:border-white/[0.15] text-black dark:text-white hover:border-black/30 dark:hover:border-white/30'
                    }`}
                    title="Click to copy number"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-500 dark:text-gray-400 px-0.5">
                  <li>Open your <strong>{activeGateway.name}</strong> app on your mobile device.</li>
                  <li>Select <strong>Send Money</strong> or <strong>Payment</strong> to: <code className="font-mono font-bold text-xs text-black dark:text-white">{activeMerchantNumber}</code></li>
                  <li>Send exact amount: <strong className="font-mono text-black dark:text-white">{formatBDT(plan.priceBDT)}</strong></li>
                  <li>Copy the <strong>Transaction ID (TrxID)</strong> from your SMS receipt and submit below.</li>
                </ol>
              </div>

              {/* Verification Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 rounded-[8px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-black dark:text-white mb-1">
                    Your Sender Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={senderNumber}
                    onChange={e => setSenderNumber(e.target.value)}
                    placeholder="e.g. 01812345678"
                    className="w-full px-3.5 py-2.5 text-xs rounded-[12px] border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#1F1F1F] text-black dark:text-white font-mono focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-black dark:text-white mb-1">
                    SMS Transaction ID (TrxID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={trxId}
                    onChange={e => setTrxId(e.target.value)}
                    placeholder="e.g. BKB8792019X or 9G821KLA"
                    className="w-full px-3.5 py-2.5 text-xs rounded-[12px] border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#1F1F1F] text-black dark:text-white font-mono uppercase focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                  <span className="text-[10px] text-gray-500 block mt-1">
                    Enter the exact TrxID received from {gateway.toUpperCase()} SMS.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 px-5 rounded-full font-semibold text-xs text-white dark:text-black bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-75 mt-2 shadow-xs cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Transaction...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Submit Payment for Verification</span>
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
