import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Home,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Moon,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatBDT } from '../../utils/billing.ts';
import { Payment } from '../../types/index.ts';
import { UserAvatar } from '../common/UserAvatar.tsx';
import {
  getAccountRoleLabel,
  getSubscriptionSummary,
  normalizePaymentStatus,
} from '../../utils/navigation.ts';
import {
  buildAndroidChromeIntentUrl,
  isAndroidUserAgent,
  isFacebookInAppBrowser,
  isSyntheticPhoneEmail,
} from '../../utils/expressCheckout.ts';

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
  const { user, token, refreshUser, bindGoogleAccount, openPaymentModal, theme, setTheme, logout } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Account Security & Recovery state (Email, Password, Google Binding)
  const [emailInput, setEmailInput] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [bindingGoogle, setBindingGoogle] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !emailInput.trim()) return;
    setSecurityFeedback(null);
    setSavingEmail(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add email address.');
      }
      setEmailInput('');
      await refreshUser();
      setSecurityFeedback({
        type: 'success',
        text: 'Email address saved! Receipts and password OTPs will now go to your inbox.',
      });
    } catch (err: any) {
      setSecurityFeedback({ type: 'error', text: err?.message || 'Could not update email.' });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (passwordInput.length < 6) {
      setSecurityFeedback({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setSecurityFeedback(null);
    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: passwordInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to set password.');
      }
      setPasswordInput('');
      await refreshUser();
      setSecurityFeedback({
        type: 'success',
        text: 'Password saved! You can now sign in anytime with your phone or email.',
      });
    } catch (err: any) {
      setSecurityFeedback({ type: 'error', text: err?.message || 'Could not save password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleBindGoogle = async () => {
    setSecurityFeedback(null);
    setBindingGoogle(true);
    try {
      await bindGoogleAccount();
      await refreshUser();
      setSecurityFeedback({
        type: 'success',
        text: 'Google account bound successfully! You can now 1-click Sign in with Google anytime.',
      });
    } catch (err: any) {
      setSecurityFeedback({
        type: 'error',
        text: err?.message || 'Failed to bind Google account.',
      });
    } finally {
      setBindingGoogle(false);
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
  const needsEmail = Boolean(user.needs_email || isSyntheticPhoneEmail(user.email));
  const hasPassword = user.has_password !== false;
  const googleLinked = Boolean(user.google_linked || user.firebase_uid);
  const needsAccountSetup = needsEmail || !hasPassword || !googleLinked;
  const isFbIab =
    typeof navigator !== 'undefined' && isFacebookInAppBrowser(navigator.userAgent);
  const isAndroid =
    typeof navigator !== 'undefined' && isAndroidUserAgent(navigator.userAgent);

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
            <UserAvatar
              user={user}
              sizeClassName="w-11 h-11 text-sm"
              imgClassName="border border-black/[0.08] dark:border-white/[0.1]"
              testId="account-modal-user-avatar"
            />
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
                {needsEmail ? (user.phone ? `Phone: ${user.phone}` : 'Phone Account') : user.email}
                {!needsEmail && user.phone ? ` · ${user.phone}` : ''}
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

      {/* Section 1b: Account Security & Login Recovery (Email, Password, Google Binding) */}
      <section aria-label="Account Security and Login Recovery" className="space-y-3.5" data-testid="account-security-section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
            Account Security &amp; Connected Login
          </h3>
          {needsAccountSetup ? (
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              Recommended Setup
            </span>
          ) : (
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              Fully Secured
            </span>
          )}
        </div>

        <div className="rounded-2xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08] p-4 sm:p-5 space-y-4">
          {securityFeedback && (
            <div
              className={`p-3 text-xs rounded-xl border flex items-start gap-2 ${
                securityFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-300'
              }`}
            >
              {securityFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{securityFeedback.text}</span>
            </div>
          )}

          {(needsEmail || !hasPassword) && (
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-relaxed">
              Add an email, set a password, or bind your Google account below so you can easily log back in from any browser and receive payment receipts.
            </p>
          )}

          {/* Row 1: Email Address */}
          <div className="pt-1">
            {needsEmail ? (
              <form onSubmit={handleSaveEmail} className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Add Email Address <span className="font-normal text-[#444746] dark:text-[#9aa0a6]">(For receipts &amp; OTP recovery)</span>
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-[#444746] dark:text-[#9aa0a6]" />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="yourname@gmail.com"
                      data-testid="account-add-email-input"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingEmail || !emailInput.trim()}
                    data-testid="account-add-email-btn"
                    className="h-9 px-4 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] text-xs font-semibold shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    {savingEmail ? 'Saving...' : 'Add Email'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs py-1">
                <span className="text-[#444746] dark:text-[#9aa0a6] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Recovery Email: <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">{user.email}</strong></span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Email Added</span>
                </span>
              </div>
            )}
          </div>

          {/* Row 2: Set Password */}
          <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            {!hasPassword ? (
              <form onSubmit={handleSavePassword} className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Set Account Password <span className="font-normal text-[#444746] dark:text-[#9aa0a6]">(Sign in anytime with phone or email)</span>
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-[#444746] dark:text-[#9aa0a6]" />
                    <input
                      type="password"
                      required
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                      placeholder="Create password (min 6 characters)"
                      data-testid="account-set-password-input"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingPassword || passwordInput.length < 6}
                    data-testid="account-set-password-btn"
                    className="h-9 px-4 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] text-xs font-semibold shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    {savingPassword ? 'Saving...' : 'Set Password'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs py-1">
                <span className="text-[#444746] dark:text-[#9aa0a6] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Account Password</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Password Set</span>
                </span>
              </div>
            )}
          </div>

          {/* Row 3: Bind your account with Google */}
          <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                Google Account Sign-In
              </p>
              <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] mt-0.5">
                {googleLinked
                  ? 'Linked! You can sign in with 1 click using Google anytime.'
                  : 'Connect Google so you can access this exact plan & history with 1 click.'}
              </p>
              {!googleLinked && isFbIab && isAndroid && typeof window !== 'undefined' && (
                <a
                  href={buildAndroidChromeIntentUrl(window.location.href)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] underline mt-1"
                >
                  <span>Open in Chrome to bind Google</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {googleLinked ? (
              <span
                data-testid="account-google-bound-badge"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shrink-0 self-start sm:self-auto"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Bound with Google</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleBindGoogle}
                disabled={bindingGoogle}
                data-testid="account-bind-google-btn"
                className="h-9 px-4 rounded-full font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3] bg-white dark:bg-[#1e1f20] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] border border-black/[0.1] dark:border-white/[0.12] transition-colors inline-flex items-center justify-center gap-2 shrink-0 disabled:opacity-60 cursor-pointer self-start sm:self-auto"
              >
                {bindingGoogle ? (
                  <span className="w-3.5 h-3.5 border-2 border-[#1f1f1f] dark:border-[#e3e3e3] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Bind your account with Google</span>
              </button>
            )}
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
