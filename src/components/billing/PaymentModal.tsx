import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, Copy, Check, ArrowRight, Smartphone, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { PLANS, formatBDT } from '../../utils/billing.ts';

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
  const [success, setSuccess] = useState<string | null>(null);

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    bkash_number: '01812345678',
    nagad_number: '01712345678',
    rocket_number: '01912345678'
  });

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  useEffect(() => {
    if (user?.phone && !senderNumber) {
      setSenderNumber(user.phone);
    }
  }, [user]);

  if (!isOpen) return null;

  const plan = PLANS[selectedPlan];
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

    const cleanTrx = trxId.trim();
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
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: selectedPlan,
          paymentMethod: gateway,
          trxId: cleanTrx.toUpperCase(),
          senderNumber: cleanSender
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment verification failed.');
      }

      setSuccess('Payment verified successfully! Your subscription is now active.');
      await refreshUser();

      setTimeout(() => {
        onClose();
        if (onSuccessRedirectToChat) {
          onSuccessRedirectToChat();
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Payment processing error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto p-6 sm:p-7 space-y-5">
          {/* Header */}
          <div className="text-center">
            <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block mb-1">
              Official MFS Payment Gateway
            </span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Upgrade Subscription
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Instant activation via bKash, Nagad, and Rocket
            </p>
          </div>

          {/* Plan Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedPlan('monthly')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                selectedPlan === 'monthly'
                  ? 'border-gray-900 dark:border-white bg-gray-50/50 dark:bg-gray-800/40 ring-1 ring-gray-900/10 dark:ring-white/10'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Monthly Plan</span>
                <span className="w-3.5 h-3.5 rounded-full border border-gray-400 flex items-center justify-center">
                  {selectedPlan === 'monthly' && <span className="w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-white" />}
                </span>
              </div>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white mt-1 font-mono">
                {formatBDT(PLANS.monthly.priceBDT)}
                <span className="text-xs font-normal text-gray-400">/mo</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">30-day access • 50,000 tokens</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlan('yearly')}
              className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                selectedPlan === 'yearly'
                  ? 'border-gray-900 dark:border-white bg-gray-50/50 dark:bg-gray-800/40 ring-1 ring-gray-900/10 dark:ring-white/10'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
              }`}
            >
              <span className="absolute -top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                SAVE 36%
              </span>
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Yearly Plan</span>
                <span className="w-3.5 h-3.5 rounded-full border border-gray-400 flex items-center justify-center">
                  {selectedPlan === 'yearly' && <span className="w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-white" />}
                </span>
              </div>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white mt-1 font-mono">
                {formatBDT(PLANS.yearly.priceBDT)}
                <span className="text-xs font-normal text-gray-400">/yr</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">365-day access • 750,000 tokens</p>
            </button>
          </div>

          {/* Payment Gateway (3 Verified Bangladeshi MFS Options: bKash, Nagad, Rocket) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Mobile Financial Service (MFS):
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setGateway('bkash')}
                className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold ${
                  gateway === 'bkash'
                    ? 'border-[#E2136E] bg-pink-50/50 dark:bg-pink-950/20 text-[#E2136E] shadow-xs'
                    : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                }`}
              >
                <span className="text-sm">bKash</span>
                <span className="text-[10px] font-mono opacity-80">বিকাশ</span>
              </button>

              <button
                type="button"
                onClick={() => setGateway('nagad')}
                className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold ${
                  gateway === 'nagad'
                    ? 'border-[#F7941D] bg-orange-50/50 dark:bg-orange-950/20 text-[#F7941D] shadow-xs'
                    : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                }`}
              >
                <span className="text-sm">Nagad</span>
                <span className="text-[10px] font-mono opacity-80">নগদ</span>
              </button>

              <button
                type="button"
                onClick={() => setGateway('rocket')}
                className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold ${
                  gateway === 'rocket'
                    ? 'border-[#8C3494] bg-purple-50/50 dark:bg-purple-950/20 text-[#8C3494] shadow-xs'
                    : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                }`}
              >
                <span className="text-sm">Rocket</span>
                <span className="text-[10px] font-mono opacity-80">রকেট</span>
              </button>
            </div>
          </div>

          {/* Payment Instructions Box with Dynamic Number */}
          <div className="bg-gray-50/90 dark:bg-gray-850/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-gray-500" />
                <span>Send {formatBDT(plan.priceBDT)} to {gateway.toUpperCase()} Number:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyMerchant}
                className="px-2.5 py-1 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md font-mono font-bold text-gray-900 dark:text-white flex items-center gap-1 hover:bg-gray-50 transition-colors shadow-xs"
                title="Click to copy number"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                <span>{copied ? 'Copied!' : activeMerchantNumber}</span>
              </button>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
              <li>Open your <strong>{gateway.toUpperCase()}</strong> app on your mobile device.</li>
              <li>Select <strong>Send Money</strong> or <strong>Payment</strong> and enter recipient number: <code className="font-mono font-bold text-gray-800 dark:text-gray-200">{activeMerchantNumber}</code></li>
              <li>Enter exact amount: <strong className="font-mono text-gray-800 dark:text-gray-200">{formatBDT(plan.priceBDT)}</strong></li>
              <li>Complete the transfer and copy the <strong>Transaction ID (TrxID)</strong> from your SMS receipt.</li>
            </ol>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your Sender Mobile Number *
              </label>
              <input
                type="text"
                required
                value={senderNumber}
                onChange={e => setSenderNumber(e.target.value)}
                placeholder="e.g. 01812345678"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transaction ID (TrxID) *
              </label>
              <input
                type="text"
                required
                value={trxId}
                onChange={e => setTrxId(e.target.value)}
                placeholder="e.g. BKB8792019X or 9G821KLA"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <span className="text-[10px] text-gray-400 block mt-1">
                Enter the exact TrxID from your SMS receipt to verify your payment.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white dark:text-gray-950 bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 shadow-xs cursor-pointer"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white dark:border-gray-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Payment & Activate Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
