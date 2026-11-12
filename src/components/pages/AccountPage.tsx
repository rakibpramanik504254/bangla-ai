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
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold tracking-tight text-black dark:text-white">Authentication Required</h2>
        <p className="text-xs text-gray-500 mt-1">Please sign in to access your account dashboard.</p>
      </div>
    );
  }

  const sub = user.subscription;
  const active = user.role === 'admin' || isSubscriptionActive(sub);
  const remainingTokens = Math.max(0, user.usage_limit - user.current_usage);
  const usagePercent = Math.min(100, Math.round((user.current_usage / Math.max(1, user.usage_limit)) * 100));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 space-y-10 animate-in fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.08] dark:border-white/[0.08] pb-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 block mb-1">
            Subscriber Portal
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Account & Subscriptions
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage your personal profile, active subscription status, and token usage
          </p>
        </div>
        <button
          onClick={() => refreshUser()}
          className="self-start sm:self-auto h-9 px-4 rounded-full border border-black/[0.12] dark:border-white/[0.15] hover:border-black/30 dark:hover:border-white/30 text-xs font-semibold text-black dark:text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-[#0c0c0c] rounded-[8px] p-6 border border-black/[0.08] dark:border-white/[0.08] shadow-xs space-y-5">
          <div className="flex items-center gap-3.5">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-11 h-11 rounded-full object-cover shrink-0 border border-black/10" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-black text-white dark:bg-white dark:text-black font-bold text-sm flex items-center justify-center">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-bold text-black dark:text-white text-sm">{user.name}</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-gray-600 dark:text-gray-400 mt-1 inline-block">
                {user.role === 'admin' ? 'Administrator' : 'Standard Member'}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-black/[0.08] dark:border-white/[0.08] text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2.5">
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="font-mono">{user.phone || 'No phone linked'}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Status: <strong className="text-black dark:text-white">Active</strong></span>
            </div>
          </div>
        </div>

        {/* Subscription Status Card */}
        <div className="md:col-span-2 bg-white dark:bg-[#0c0c0c] rounded-[8px] p-6 border border-black/[0.08] dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-black dark:text-white" />
                <h3 className="font-bold text-black dark:text-white text-sm">Active Plan</h3>
              </div>
              <span
                className={`text-[11px] font-mono px-3 py-1 rounded-full flex items-center gap-1.5 border ${
                  active
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                    : 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {active ? 'Subscription Active' : 'No Active Plan'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-[#FAFAFA] dark:bg-[#141414] p-3.5 rounded-[8px] border border-black/[0.06] dark:border-white/[0.06]">
                <span className="text-[10px] uppercase font-mono text-gray-400 block">Plan</span>
                <p className="font-bold text-sm text-black dark:text-white mt-1">
                  {sub ? sub.plan_name : 'Free Tier'}
                </p>
                {sub && (
                  <span className="text-[11px] font-mono text-gray-500">
                    {formatBDT(sub.amount)}
                  </span>
                )}
              </div>

              <div className="bg-[#FAFAFA] dark:bg-[#141414] p-3.5 rounded-[8px] border border-black/[0.06] dark:border-white/[0.06]">
                <span className="text-[10px] uppercase font-mono text-gray-400 block">Renewal / Expiry</span>
                <p className="font-bold text-sm text-black dark:text-white mt-1 font-mono">
                  {sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  }) : '—'}
                </p>
              </div>

              <div className="bg-[#FAFAFA] dark:bg-[#141414] p-3.5 rounded-[8px] border border-black/[0.06] dark:border-white/[0.06]">
                <span className="text-[10px] uppercase font-mono text-gray-400 block">Gateway</span>
                <p className="font-bold text-sm text-black dark:text-white mt-1 uppercase">
                  {sub?.payment_method || '—'}
                </p>
                <span className="text-[10px] text-gray-500 font-mono truncate block">
                  {sub?.trx_id ? `Trx: ${sub.trx_id}` : ''}
                </span>
              </div>
            </div>

            {/* Usage Progress Bar */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Token Consumption:</span>
                <span className="font-mono text-black dark:text-white">
                  <strong>{remainingTokens.toLocaleString()}</strong> / {user.usage_limit.toLocaleString()} tokens ({usagePercent}% used)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePercent > 85 ? 'bg-red-500' : 'bg-black dark:bg-white'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-black/[0.08] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-gray-500">Need more quota or want to renew early?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openPaymentModal('monthly')}
                className="h-9 px-4 rounded-full text-xs font-semibold border border-black/[0.12] dark:border-white/[0.15] hover:border-black/30 dark:hover:border-white/30 text-black dark:text-white transition-colors cursor-pointer"
              >
                Renew Monthly (৳1,299)
              </button>
              <button
                onClick={() => openPaymentModal('yearly')}
                className="h-9 px-4 rounded-full text-xs font-semibold bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black transition-all cursor-pointer shadow-xs"
              >
                Upgrade Yearly (৳9,999)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payment Alert Banner if any exists */}
      {payments.some((p) => p.status === 'pending') && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-[8px] p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-black dark:text-white">
              Payment Verification In Progress
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              Your transaction submission is currently in our queue. Our administrators verify bKash / Nagad / Rocket transaction IDs with Bangladesh MFS logs. Once approved, your subscription unlocks immediately and you'll receive full premium model access.
            </p>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white dark:bg-[#0c0c0c] rounded-[8px] p-6 border border-black/[0.08] dark:border-white/[0.08] shadow-xs space-y-4">
        <h3 className="font-bold text-black dark:text-white text-sm">Payment History</h3>
        {loadingPayments ? (
          <div className="py-8 text-center text-xs text-gray-500">Loading payment history...</div>
        ) : payments.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">No payment records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-black/[0.08] dark:border-white/[0.08] text-gray-400 font-mono text-[11px]">
                <tr>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Gateway</th>
                  <th className="pb-3 font-medium">Transaction ID</th>
                  <th className="pb-3 font-medium">Sender</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04] font-mono text-[11px]">
                {payments.map(p => {
                  const status = p.status || 'completed';
                  return (
                    <tr key={p.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 text-gray-600 dark:text-gray-400">
                        {new Date(p.created_at).toLocaleDateString('en-US')}
                      </td>
                      <td className="py-3 font-semibold text-black dark:text-white uppercase">
                        {p.gateway}
                      </td>
                      <td className="py-3 text-gray-700 dark:text-gray-300 font-bold">
                        {p.trx_id}
                      </td>
                      <td className="py-3 text-gray-500">
                        {p.sender_number || p.phone || '—'}
                      </td>
                      <td className="py-3 font-bold text-black dark:text-white">
                        {formatBDT(p.amount)}
                      </td>
                      <td className="py-3 text-right">
                        {status === 'completed' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            COMPLETED
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20 animate-pulse">
                            PENDING REVIEW
                          </span>
                        )}
                        {status === 'rejected' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold border border-red-500/20">
                            REJECTED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
