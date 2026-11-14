import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CreditCard,
  Home,
  LogOut,
  MessageSquare,
  Moon,
  RefreshCw,
  Shield,
  Sun,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatBDT } from '../../utils/billing.ts';
import { Payment } from '../../types/index.ts';
import {
  getAccountRoleLabel,
  getSubscriptionSummary,
  normalizePaymentStatus,
} from '../../utils/navigation.ts';

interface AccountBillingPanelProps {
  compact?: boolean;
  onCloseModal?: () => void;
  onNavigateChat?: () => void;
  onNavigateHome?: () => void;
  onNavigateAdmin?: () => void;
}

export const AccountBillingPanel: React.FC<AccountBillingPanelProps> = ({
  compact = false,
  onCloseModal,
  onNavigateChat,
  onNavigateHome,
  onNavigateAdmin,
}) => {
  const { user, token, refreshUser, openPaymentModal, theme, setTheme, logout } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!token) {
      setLoadingPayments(false);
      return;
    }
    try {
      const res = await fetch('/api/payments/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load payment history:', err);
    } finally {
      setLoadingPayments(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshUser(), fetchPayments()]);
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <div className="py-12 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-[#444746] dark:text-[#9aa0a6] mx-auto" />
        <p className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
          Authentication Required
        </p>
        <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
          Please sign in to manage your account, appearance, and billing.
        </p>
      </div>
    );
  }

  const roleLabel = getAccountRoleLabel(user);
  const summary = getSubscriptionSummary(user);

  const renderStatusBadge = (status?: string | null) => {
    const badge = normalizePaymentStatus(status);
    if (badge.variant === 'approved') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
          {badge.label}
        </span>
      );
    }
    if (badge.variant === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-semibold border border-amber-500/25">
          {badge.label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-400 text-[11px] font-semibold border border-red-500/20">
        {badge.label}
      </span>
    );
  };

  return (
    <div className={compact ? 'space-y-6' : 'space-y-7'}>
      {/* Section 1: Profile & Preferences */}
      <section aria-label="Profile and Preferences" className="space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
            Profile &amp; Preferences
          </h3>
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="h-7 px-2.5 rounded-full border border-black/[0.08] dark:border-white/[0.1] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>

        <div className="rounded-2xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover shrink-0 border border-black/[0.08] dark:border-white/[0.1]"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold text-sm flex items-center justify-center shrink-0">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                  {user.name}
                </span>
                <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">·</span>
                <span className="text-xs font-medium text-[#444746] dark:text-[#9aa0a6]">
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6] truncate mt-0.5">
                {user.email}
                {user.phone ? ` · ${user.phone}` : ''}
              </p>
            </div>
          </div>

          {/* Appearance / Theme Switcher */}
          <div className="shrink-0 w-full sm:w-56">
            <span className="sr-only">Appearance</span>
            <div
              role="radiogroup"
              aria-label="Theme preference"
              className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/80 dark:bg-[#1e1f20] border border-black/[0.06] dark:border-white/[0.08]"
            >
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'light'}
                data-testid="settings-theme-light"
                onClick={() => setTheme('light')}
                className={`h-8 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-[#1f1f1f] text-white shadow-2xs'
                    : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light Mode</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'dark'}
                data-testid="settings-theme-dark"
                onClick={() => setTheme('dark')}
                className={`h-8 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#e3e3e3] text-[#131314] shadow-2xs'
                    : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Subscription & Token Usage */}
      <section aria-label="Subscription and Token Usage" className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
            Subscription &amp; Token Usage
          </h3>
          <span
            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
              summary.isActive
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6]'
            }`}
          >
            {summary.isActive ? 'Subscription Active' : 'Free Tier'}
          </span>
        </div>

        <div className="rounded-2xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08] p-4 sm:p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <div className="min-w-0">
              <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6] block">
                Current Plan
              </span>
              <p className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] mt-0.5 truncate">
                {summary.planLabel}
                {summary.planAmountLabel && !summary.planLabel.includes(summary.planAmountLabel)
                  ? ` · ${summary.planAmountLabel}`
                  : ''}
              </p>
            </div>

            <div className="min-w-0">
              <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6] block">
                Renewal / Expiry
              </span>
              <p className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] mt-0.5 font-mono tabular-nums">
                {summary.expiresAtLabel}
              </p>
            </div>

            <div className="min-w-0">
              <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6] block">
                Payment Gateway
              </span>
              <p className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] mt-0.5 truncate">
                {summary.gatewayLabel}
                {summary.trxId ? (
                  <span className="text-[11px] font-mono font-normal text-[#444746] dark:text-[#9aa0a6] ml-1.5">
                    ({summary.trxId})
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          {/* Token Quota Progress Bar */}
          <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                Remaining Token Balance
              </span>
              <span className="font-mono tabular-nums text-[#444746] dark:text-[#9aa0a6]">
                {summary.usageLimit > 0 ? (
                  <>
                    <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">
                      {summary.remainingTokens.toLocaleString()}
                    </strong>{' '}
                    / {summary.usageLimit.toLocaleString()} tokens ({summary.usagePercent}% used)
                  </>
                ) : (
                  <span>0 tokens · Activate Monthly (৳699) or Yearly (৳5,999)</span>
                )}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/[0.08] dark:bg-white/[0.1] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  summary.usagePercent > 85
                    ? 'bg-red-500'
                    : 'bg-[#1f1f1f] dark:bg-[#e3e3e3]'
                }`}
                style={{ width: `${summary.usagePercent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-[1.6]">
              {summary.isActive
                ? 'Switch between Monthly (৳699) and Yearly (৳5,999) or extend your quota anytime.'
                : 'Unlock all 10 foundation models via bKash, Nagad, or Rocket.'}
            </p>
            <button
              type="button"
              onClick={() => {
                onCloseModal?.();
                openPaymentModal('monthly');
              }}
              className="h-9 px-5 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{summary.actionLabel}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Billing & Payment History */}
      <section aria-label="Billing and Payment History" className="space-y-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
          Billing &amp; Payment History
        </h3>

        {payments.some((p) => (p.status || '').toLowerCase() === 'pending') && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[#444746] dark:text-[#c4c7c5] leading-[1.65]">
              <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Verification in progress:</strong>{' '}
              Our team verifies bKash, Nagad, and Rocket TrxID submissions shortly. Your plan unlocks automatically once approved.
            </p>
          </div>
        )}

        <div className="rounded-2xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
          {loadingPayments ? (
            <div className="py-8 text-center text-xs text-[#444746] dark:text-[#9aa0a6]">
              Loading billing history...
            </div>
          ) : payments.length === 0 ? (
            <div className="py-8 px-4 text-center text-xs text-[#444746] dark:text-[#9aa0a6]">
              No bKash, Nagad, or Rocket transactions recorded yet.
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                {payments.map((p) => (
                  <div key={p.id} className="p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] uppercase font-mono tabular-nums">
                        {p.gateway} · {formatBDT(p.amount)}
                      </span>
                      {renderStatusBadge(p.status)}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                      <span className="truncate">TrxID: {p.trx_id}</span>
                      <span className="shrink-0 tabular-nums">
                        {new Date(p.created_at).toLocaleDateString('en-US')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-black/[0.06] dark:border-white/[0.08] text-[#444746] dark:text-[#9aa0a6] font-mono text-[11px]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Date</th>
                      <th className="py-3 px-4 font-medium">Gateway</th>
                      <th className="py-3 px-4 font-medium">Transaction ID</th>
                      <th className="py-3 px-4 font-medium text-right">Amount</th>
                      <th className="py-3 px-4 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06] font-mono text-[11.5px] tabular-nums">
                    {payments.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-3 px-4 text-[#444746] dark:text-[#9aa0a6]">
                          {new Date(p.created_at).toLocaleDateString('en-US')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] uppercase">
                          {p.gateway}
                        </td>
                        <td className="py-3 px-4 text-[#1f1f1f] dark:text-[#e3e3e3] font-medium">
                          {p.trx_id}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                          {formatBDT(p.amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          {renderStatusBadge(p.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Optional Quick Navigation Actions (shown in modal context) */}
      {(onNavigateChat || onNavigateHome || (user.role === 'admin' && onNavigateAdmin) || onCloseModal) && (
        <div className="pt-4 border-t border-black/[0.08] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateChat && (
              <button
                type="button"
                onClick={() => {
                  onCloseModal?.();
                  onNavigateChat();
                }}
                className="h-9 px-3.5 rounded-full bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                <span>AI Workspace</span>
                <ArrowUpRight className="w-3 h-3 text-[#444746] dark:text-[#9aa0a6]" />
              </button>
            )}

            {user.role === 'admin' && onNavigateAdmin && (
              <button
                type="button"
                onClick={() => {
                  onCloseModal?.();
                  onNavigateAdmin();
                }}
                className="h-9 px-3.5 rounded-full bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                <span>Admin Console</span>
              </button>
            )}

            {onNavigateHome && (
              <button
                type="button"
                onClick={() => {
                  onCloseModal?.();
                  onNavigateHome();
                }}
                className="h-9 px-3.5 rounded-full bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-xs font-medium text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Homepage</span>
              </button>
            )}
          </div>

          {onCloseModal && (
            <button
              type="button"
              onClick={() => {
                onCloseModal();
                logout();
              }}
              className="h-9 px-3.5 rounded-full text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
