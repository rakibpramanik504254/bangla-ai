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
      const res = await fetch('/api/payments/verify', {
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Payment verification failed.');
      }

      setSuccess(`Payment verified! Your ${plan.name} has been activated.`);
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
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0c0c0c] rounded-[16px] shadow-2xl border border-black/[0.12] dark:border-white/[0.15] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors z-10 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 block mb-1">
              Official MFS Payment Verification
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
              Activate Subscription
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Direct verification via bKash, Nagad, and Rocket
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
              <p className="text-[11px] text-gray-500 mt-1">30 days • 50,000 tokens</p>
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
                SAVE 36%
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
              <p className="text-[11px] text-gray-500 mt-1">365 days • 750,000 tokens</p>
            </button>
          </div>

          {/* Payment Gateway: bKash, Nagad, Rocket */}
          <div>
            <label className="block text-xs font-semibold text-black dark:text-white mb-2">
              Select Mobile Financial Service:
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setGateway('bkash')}
                className={`py-2.5 px-2 rounded-full border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  gateway === 'bkash'
                    ? 'border-black dark:border-white bg-black/[0.05] dark:bg-white/[0.08] font-bold text-black dark:text-white'
                    : 'border-black/[0.08] dark:border-white/[0.08] text-gray-600 dark:text-gray-400 hover:border-black/30'
                }`}
              >
                <span className="text-xs font-bold">bKash</span>
                <span className="text-[10px] font-mono text-gray-400">বিকাশ</span>
              </button>

              <button
                type="button"
                onClick={() => setGateway('nagad')}
                className={`py-2.5 px-2 rounded-full border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  gateway === 'nagad'
                    ? 'border-black dark:border-white bg-black/[0.05] dark:bg-white/[0.08] font-bold text-black dark:text-white'
                    : 'border-black/[0.08] dark:border-white/[0.08] text-gray-600 dark:text-gray-400 hover:border-black/30'
                }`}
              >
                <span className="text-xs font-bold">Nagad</span>
                <span className="text-[10px] font-mono text-gray-400">নগদ</span>
              </button>

              <button
                type="button"
                onClick={() => setGateway('rocket')}
                className={`py-2.5 px-2 rounded-full border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  gateway === 'rocket'
                    ? 'border-black dark:border-white bg-black/[0.05] dark:bg-white/[0.08] font-bold text-black dark:text-white'
                    : 'border-black/[0.08] dark:border-white/[0.08] text-gray-600 dark:text-gray-400 hover:border-black/30'
                }`}
              >
                <span className="text-xs font-bold">Rocket</span>
                <span className="text-[10px] font-mono text-gray-400">রকেট</span>
              </button>
            </div>
          </div>

          {/* Payment Instructions Box with Dynamic Number */}
          <div className="bg-[#F8F9FA] dark:bg-[#141414] rounded-[8px] p-4 border border-black/[0.08] dark:border-white/[0.08] text-xs text-gray-600 dark:text-gray-400 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-black dark:text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                <span>Send {formatBDT(plan.priceBDT)} to {gateway.toUpperCase()}:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyMerchant}
                className="px-2.5 py-1 text-[11px] bg-white dark:bg-[#1f1f1f] border border-black/[0.1] dark:border-white/[0.1] rounded-full font-mono font-bold text-black dark:text-white flex items-center gap-1 hover:bg-black/[0.03] transition-colors cursor-pointer"
                title="Click to copy number"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                <span>{copied ? 'Copied' : activeMerchantNumber}</span>
              </button>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
              <li>Open your <strong>{gateway.toUpperCase()}</strong> app on your mobile device.</li>
              <li>Select <strong>Send Money</strong> or <strong>Payment</strong> and enter number: <code className="font-mono font-bold text-black dark:text-white">{activeMerchantNumber}</code></li>
              <li>Send exact amount: <strong className="font-mono text-black dark:text-white">{formatBDT(plan.priceBDT)}</strong></li>
              <li>Copy the <strong>Transaction ID (TrxID)</strong> from your SMS receipt.</li>
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

            {success && (
              <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-300 rounded-[8px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{success}</span>
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
                className="w-full px-3.5 py-2.5 text-xs rounded-[12px] border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#121212] text-black dark:text-white font-mono focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-black dark:text-white mb-1">
                Transaction ID (TrxID) *
              </label>
              <input
                type="text"
                required
                value={trxId}
                onChange={e => setTrxId(e.target.value)}
                placeholder="e.g. BKB8792019X or 9G821KLA"
                className="w-full px-3.5 py-2.5 text-xs rounded-[12px] border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#121212] text-black dark:text-white font-mono uppercase focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
              <span className="text-[10px] text-gray-500 block mt-1">
                Enter the real TrxID received from your MFS SMS notification.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 px-5 rounded-full font-semibold text-xs text-white dark:text-black bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 shadow-xs cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
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
