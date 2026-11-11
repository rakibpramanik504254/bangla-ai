import React, { useState, useEffect } from 'react';
import {
  User,
  CreditCard,
  Shield,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatBDT, isSubscriptionActive } from '../../utils/billing.ts';
import { Payment } from '../../types/index.ts';

export const AccountPage: React.FC = () => {
  const { user, token, refreshUser, openPaymentModal } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/payments/history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPayments(data);
        }
      } catch (err) {
        console.error('Failed to load payment history:', err);
      } finally {
        setLoadingPayments(false);
      }
    };
    fetchPayments();
  }, [token]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Authentication Required</h2>
        <p className="text-xs text-gray-500 mt-1">Please sign in to access your account dashboard.</p>
      </div>
    );
  }

  const sub = user.subscription;
  const active = user.role === 'admin' || isSubscriptionActive(sub);
  const remainingTokens = Math.max(0, user.usage_limit - user.current_usage);
  const usagePercent = Math.min(100, Math.round((user.current_usage / Math.max(1, user.usage_limit)) * 100));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-in fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Account & Subscriptions
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your personal profile, active subscription status, and token usage
          </p>
        </div>
        <button
          onClick={() => refreshUser()}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gray-950 text-white dark:bg-white dark:text-gray-950 font-bold text-sm flex items-center justify-center">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">{user.name}</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {user.role === 'admin' ? 'Administrator' : 'Standard Member'}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{user.phone || 'No phone linked'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Status: <strong className="text-emerald-600 dark:text-emerald-400">Active</strong></span>
            </div>
          </div>
        </div>

        {/* Subscription Status Card */}
        <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Active Plan</h3>
              </div>
              <span
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-800'
                }`}
              >
                {active ? 'Subscription Active' : 'No Active Subscription'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-gray-50/70 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800/80">
                <span className="text-[10px] uppercase font-mono text-gray-400 block">Plan</span>
                <p className="font-bold text-sm text-gray-900 dark:text-white mt-0.5">
                  {sub ? sub.plan_name : 'None'}
                </p>
                {sub && (
                  <span className="text-[10px] font-mono text-gray-500">
                    {formatBDT(sub.amount)}
                  </span>
                )}
              </div>

              <div className="bg-gray-50/70 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800/80">
                <span className="text-[10px] uppercase font-mono text-gray-400 block">Renewal / Expiry</span>
                <p className="font-bold text-sm text-gray-900 dark:text-white mt-0.5 font-mono">
                  {sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  }) : '—'}
                </p>
              </div>

              <div className="bg-gray-50/70 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800/80">
                <span className="text-[10px] uppercase font-mono text-gray-400 block">Gateway</span>
                <p className="font-bold text-sm text-gray-900 dark:text-white mt-0.5 uppercase">
                  {sub?.payment_method || '—'}
                </p>
                <span className="text-[10px] text-gray-400 font-mono truncate block">
                  {sub?.trx_id ? `Trx: ${sub.trx_id}` : ''}
                </span>
              </div>
            </div>

            {/* Usage Progress Bar */}
            <div className="mt-6 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Token Consumption:</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  <strong>{remainingTokens.toLocaleString()}</strong> / {user.usage_limit.toLocaleString()} remaining ({usagePercent}% used)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePercent > 85 ? 'bg-red-500' : 'bg-gray-900 dark:bg-white'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-gray-500">Need more quota or want to renew early?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openPaymentModal('monthly')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white transition-colors"
              >
                Renew Monthly (৳1,299)
              </button>
              <button
                onClick={() => openPaymentModal('yearly')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 transition-all"
              >
                Upgrade Yearly (৳9,999)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-xs space-y-3">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Payment History</h3>
        {loadingPayments ? (
          <div className="py-6 text-center text-xs text-gray-400">Loading payment history...</div>
        ) : payments.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">No payment records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-mono text-[11px]">
                <tr>
                  <th className="pb-2.5 font-medium">Date</th>
                  <th className="pb-2.5 font-medium">Gateway</th>
                  <th className="pb-2.5 font-medium">Transaction ID</th>
                  <th className="pb-2.5 font-medium">Amount</th>
                  <th className="pb-2.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-mono text-[11px]">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-3 text-gray-600 dark:text-gray-400">
                      {new Date(p.created_at).toLocaleDateString('en-US')}
                    </td>
                    <td className="py-3 font-semibold text-gray-900 dark:text-white uppercase">
                      {p.gateway}
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-300">
                      {p.trx_id}
                    </td>
                    <td className="py-3 font-bold text-gray-900 dark:text-white">
                      {formatBDT(p.amount)}
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                        COMPLETED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
