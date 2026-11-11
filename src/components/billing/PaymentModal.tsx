import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Copy, Check, ArrowRight, Zap, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { PLANS, formatBDT } from '../../utils/billing.ts';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: 'monthly' | 'yearly';
  onSuccessRedirectToChat?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  defaultPlan = 'monthly',
  onSuccessRedirectToChat
}) => {
  const { user, token, refreshUser, openAuthModal } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(defaultPlan);
  const [gateway, setGateway] = useState<'bkash' | 'nagad' | 'rocket' | 'sslcommerz'>('bkash');
  const [senderNumber, setSenderNumber] = useState(user?.phone || '');
  const [trxId, setTrxId] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const plan = PLANS[selectedPlan];
  const merchantNumber = '01711-000000';

  const handleCopyMerchant = () => {
    navigator.clipboard.writeText(merchantNumber.replace(/[^0-9]/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickTestPayment = () => {
    setSenderNumber(user?.phone || '01812345678');
    const randomTrx = (gateway === 'bkash' ? 'BK' : gateway === 'nagad' ? 'NG' : 'RC') +
      Math.random().toString(36).substring(2, 9).toUpperCase();
    setTrxId(randomTrx);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      onClose();
      openAuthModal('login');
      return;
    }

    if (!trxId.trim()) {
      setError('Please provide a valid Transaction ID (TrxID).');
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
          trxId: trxId.trim(),
          senderNumber: senderNumber || user.phone
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment processing failed');
      }

      setSuccess('Subscription successfully activated. Welcome to Bangla AI!');
      await refreshUser();

      setTimeout(() => {
        onClose();
        if (onSuccessRedirectToChat) {
          onSuccessRedirectToChat();
        }
      }, 1400);
    } catch (err: any) {
      setError(err.message);
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
              Subscription Gateway
            </span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Select Plan & Checkout
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Secure local payments via bKash, Nagad, Rocket or Cards
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
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Monthly</span>
                <span className="w-3.5 h-3.5 rounded-full border border-gray-400 flex items-center justify-center">
                  {selectedPlan === 'monthly' && <span className="w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-white" />}
                </span>
              </div>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white mt-1 font-mono">
                {formatBDT(PLANS.monthly.priceBDT)}
                <span className="text-xs font-normal text-gray-400">/mo</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">30-day cycle • 50,000 tokens</p>
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
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Yearly</span>
                <span className="w-3.5 h-3.5 rounded-full border border-gray-400 flex items-center justify-center">
                  {selectedPlan === 'yearly' && <span className="w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-white" />}
                </span>
              </div>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white mt-1 font-mono">
                {formatBDT(PLANS.yearly.priceBDT)}
                <span className="text-xs font-normal text-gray-400">/yr</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">365-day cycle • 750,000 tokens</p>
            </button>
          </div>

          {/* Payment Gateway */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Payment Method:
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setGateway('bkash')}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold ${
                  gateway === 'bkash'
                    ? 'border-[#E2136E] bg-pink-50/50 dark:bg-pink-950/20 text-[#E2136E]'
                    : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>bKash</span>
              </button>

              <button
                type="button"
                onClick={() => setGateway('nagad')}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold ${
                  gateway === 'nagad'
                    ? 'border-[#F7941D] bg-orange-50/50 dark:bg-orange-950/20 text-[#F7941D]'
                    : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>Nagad</span>
              </button>

              <button
                type="button"
                onClick={() => setGateway('rocket')}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold ${
                  gateway === 'rocket'
                    ? 'border-[#8C3494] bg-purple-50/50 dark:bg-purple-950/20 text-[#8C3494]'
                    : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>Rocket</span>
              </button>

              <button
                type="button"
                onClick={() => setGateway('sslcommerz')}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold ${
                  gateway === 'sslcommerz'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600'
                    : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>Cards</span>
              </button>
            </div>
          </div>

          {/* Payment Steps Box */}
          <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900 dark:text-white">
                1. Send {formatBDT(plan.priceBDT)} to Merchant Account:
              </span>
              <button
                type="button"
                onClick={handleCopyMerchant}
                className="px-2 py-0.5 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md font-mono flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : merchantNumber}</span>
              </button>
            </div>
            <p>
              2. Open your <strong>{gateway.toUpperCase()}</strong> app, select Payment/Send Money, enter the merchant number and amount.
            </p>
            <p>
              3. Enter your sender phone number and the Transaction ID (TrxID) below to instantly verify.
            </p>
          </div>

          {/* Auto fill test helper */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 text-[11px]">Testing Mode Active:</span>
            <button
              type="button"
              onClick={handleQuickTestPayment}
              className="text-[11px] font-semibold text-gray-900 dark:text-white hover:underline flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>Auto-Fill Test TrxID</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="p-2.5 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="p-2.5 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sender Mobile Number *
              </label>
              <input
                type="text"
                required
                value={senderNumber}
                onChange={e => setSenderNumber(e.target.value)}
                placeholder="e.g. 01812345678"
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400"
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
                placeholder="e.g. BKB8792019X"
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white dark:text-gray-950 bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-1 shadow-xs"
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
