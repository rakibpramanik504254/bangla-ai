import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  CreditCard,
  ExternalLink,
  Home,
  Key,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  Receipt,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatBDT } from '../../utils/billing.ts';
import { Payment } from '../../types/index.ts';
import { UserAvatar } from '../common/UserAvatar.tsx';
import { WatchTutorialButton } from '../common/WatchTutorialButton.tsx';
import {
  getAccountRoleLabel,
  getSubscriptionSummary,
  normalizePaymentStatus,
} from '../../utils/navigation.ts';
import {
  buildAndroidChromeIntentUrl,
  isAndroidUserAgent,
  isFacebookInAppBrowser,
} from '../../utils/expressCheckout.ts';
import {
  ACCOUNT_NAV_GROUPS,
  type AccountPaymentFilter,
  type AccountSectionId,
  computeAccountBillingCounts,
  filterAccountPayments,
  getAccountNavItem,
  getAccountSecurityChecklist,
} from '../../utils/accountConsoleNav.ts';
import { copyTextSafely } from '../../utils/clipboard.ts';
import { DeveloperApiKeysTab } from './DeveloperApiKeysTab.tsx';

interface AccountBillingPanelProps {
  compact?: boolean;
  onCloseModal?: () => void;
  onNavigateChat?: () => void;
  onNavigateHome?: () => void;
  onNavigateAdmin?: () => void;
}

const SECTION_ICONS: Record<AccountSectionId, React.ComponentType<{ className?: string }>> = {
  overview: TrendingUp,
  subscription: Zap,
  billing: Receipt,
  api_keys: Key,
  security: ShieldCheck,
  preferences: SlidersHorizontal,
};

export const AccountBillingPanel: React.FC<AccountBillingPanelProps> = ({
  compact = false,
  onCloseModal,
  onNavigateChat,
  onNavigateHome,
  onNavigateAdmin,
}) => {
  const {
    user,
    token,
    refreshUser,
    bindGoogleAccount,
    openCheckout,
    theme,
    setTheme,
    logout,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<AccountSectionId>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<AccountPaymentFilter>('all');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Account Security & Recovery state
  const [emailInput, setEmailInput] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [bindingGoogle, setBindingGoogle] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

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

  const handleSelectSection = (id: AccountSectionId) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  const handleCopyTrx = async (text: string, id: string) => {
    await copyTextSafely(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
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
      setSecurityFeedback({
        type: 'error',
        text: err?.message || 'Could not update email.',
      });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (passwordInput.length < 6) {
      setSecurityFeedback({
        type: 'error',
        text: 'Password must be at least 6 characters.',
      });
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
      setSecurityFeedback({
        type: 'error',
        text: err?.message || 'Could not save password.',
      });
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
      <div className="py-14 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-[#444746] dark:text-[#9aa0a6] mx-auto" />
        <p className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
          Authentication Required
        </p>
        <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
          Please sign in to manage your account, subscription quota, and billing.
        </p>
      </div>
    );
  }

  const roleLabel = getAccountRoleLabel(user);
  const summary = getSubscriptionSummary(user);
  const securityChecklist = getAccountSecurityChecklist(user);
  const billingCounts = computeAccountBillingCounts(payments);
  const filteredPayments = filterAccountPayments(payments, paymentFilter, paymentSearch);
  const activeNavItem = getAccountNavItem(activeTab);

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

  const renderBadgeForNavItem = (id: AccountSectionId) => {
    if (id === 'billing' && billingCounts.pending > 0) {
      return (
        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums bg-amber-400 text-[#131314] shrink-0">
          {billingCounts.pending}
        </span>
      );
    }
    if (id === 'security' && securityChecklist.missingCount > 0) {
      return (
        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
          {securityChecklist.missingCount}
        </span>
      );
    }
    return null;
  };

  return (
    <div
      data-testid="account-console-shell"
      className={
        compact
          ? 'w-full'
          : 'w-full min-h-[calc(100vh-4rem)] bg-[#f0f4f9]/65 dark:bg-[#131314]'
      }
    >
      <div
        className={
          compact
            ? 'flex flex-col md:flex-row gap-4 lg:gap-5 items-start'
            : 'max-w-[1280px] mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col lg:flex-row gap-5 lg:gap-6 items-start'
        }
      >
        {/* Desktop Sidebar Navigation (Matches Admin Console Pattern) */}
        <aside
          aria-label="Account and Billing Navigation"
          data-testid="account-sidebar-nav"
          className={`${
            compact ? 'hidden md:flex md:flex-col w-56' : 'hidden lg:flex lg:flex-col w-60 sticky top-20'
          } shrink-0 bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden`}
        >
          {/* Member Header Card */}
          <div className="px-3.5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center gap-2.5">
            <UserAvatar
              user={user}
              sizeClassName="w-9 h-9 text-xs"
              imgClassName="border border-black/[0.08] dark:border-white/[0.1]"
              testId="account-modal-user-avatar"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                {user.name}
              </div>
              <div className="text-[10.5px] font-mono text-[#444746] dark:text-[#9aa0a6] truncate">
                {roleLabel}
              </div>
            </div>
          </div>

          {/* Grouped Tabs */}
          <nav className="p-2.5 space-y-4">
            {ACCOUNT_NAV_GROUPS.map((group) => (
              <div key={group.id} className="space-y-1">
                <div className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = SECTION_ICONS[item.id];
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSection(item.id)}
                        data-testid={`account-nav-${item.id}`}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer text-left ${
                          isActive
                            ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold'
                            : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]/60 hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate whitespace-nowrap">{item.label}</span>
                        </span>
                        {renderBadgeForNavItem(item.id)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Sidebar Workspace / Sign Out Footer */}
          {(onNavigateChat || onNavigateHome || (user.role === 'admin' && onNavigateAdmin) || onCloseModal) && (
            <div className="p-2.5 border-t border-black/[0.06] dark:border-white/[0.06] space-y-0.5">
              {onNavigateChat && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseModal?.();
                    onNavigateChat();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center justify-between gap-2 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6] shrink-0" />
                    <span className="truncate">AI Workspace</span>
                  </span>
                  <ArrowUpRight className="w-3 h-3 text-[#444746] dark:text-[#9aa0a6] shrink-0" />
                </button>
              )}

              {user.role === 'admin' && onNavigateAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseModal?.();
                    onNavigateAdmin();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6] shrink-0" />
                  <span className="truncate">Admin Console</span>
                </button>
              )}

              {onNavigateHome && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseModal?.();
                    onNavigateHome();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Homepage</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onCloseModal?.();
                  logout();
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </aside>

        {/* Mobile Section Header + Expandable Drawer + Quick Pills */}
        <div className={`${compact ? 'md:hidden' : 'lg:hidden'} w-full space-y-2.5`}>
          <div className="bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                user={user}
                sizeClassName="w-8 h-8 text-xs"
                imgClassName="border border-black/[0.08] dark:border-white/[0.1]"
              />
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] truncate">
                  {activeNavItem.groupLabel}
                </div>
                <div className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                  {activeNavItem.label}
                </div>
              </div>
            </div>

            <button
              type="button"
              data-testid="account-mobile-menu-btn"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="h-8 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#282a2c] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            >
              {mobileMenuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
              <span>{mobileMenuOpen ? 'Close' : 'All Tabs'}</span>
            </button>
          </div>

          {mobileMenuOpen && (
            <nav
              aria-label="Mobile Account Sections"
              data-testid="account-mobile-menu-drawer"
              className="bg-white dark:bg-[#1e1f20] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] p-3.5 space-y-3 animate-in fade-in"
            >
              {ACCOUNT_NAV_GROUPS.map((group) => (
                <div key={group.id} className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] px-1">
                    {group.label}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.items.map((item) => {
                      const Icon = SECTION_ICONS[item.id];
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSection(item.id)}
                          data-testid={`account-mobile-nav-${item.id}`}
                          className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-1.5 cursor-pointer text-left border transition-colors ${
                            isActive
                              ? 'bg-[#e9eef6] dark:bg-[#282a2c] border-black/[0.12] dark:border-white/[0.15] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold'
                              : 'bg-[#f0f4f9]/70 dark:bg-[#131314] border-transparent text-[#444746] dark:text-[#c4c7c5]'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{item.shortLabel}</span>
                          </span>
                          {renderBadgeForNavItem(item.id)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          )}

          {!mobileMenuOpen && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {ACCOUNT_NAV_GROUPS.flatMap((g) => g.items).map((item) => {
                const Icon = SECTION_ICONS[item.id];
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSection(item.id)}
                    className={`h-8 px-3 rounded-full text-[11px] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border transition-colors ${
                      isActive
                        ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] border-transparent font-semibold'
                        : 'bg-white dark:bg-[#1e1f20] border-black/[0.08] dark:border-white/[0.08] text-[#444746] dark:text-[#c4c7c5]'
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span>{item.shortLabel}</span>
                    {renderBadgeForNavItem(item.id)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Tab Content Viewport */}
        <main className="flex-1 min-w-0 w-full space-y-4">
          {/* Top Breadcrumb & Refresh Action Bar */}
          <div className="bg-white dark:bg-[#1e1f20] px-4 sm:px-5 py-3.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                <span>Portal</span>
                <ChevronRight className="w-3 h-3 shrink-0" />
                <span>{activeNavItem.groupLabel}</span>
                <ChevronRight className="w-3 h-3 shrink-0" />
                <span className="text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold">
                  {activeNavItem.label}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] mt-0.5">
                {activeNavItem.label}
              </h3>
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-0.5 leading-relaxed">
                {activeNavItem.description}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="self-start sm:self-auto h-8 px-3.5 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>

          {/* Pending Payment Global Alert (visible on Overview & Subscription & Billing) */}
          {billingCounts.pending > 0 &&
            (activeTab === 'overview' || activeTab === 'subscription' || activeTab === 'billing') && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[#444746] dark:text-[#c4c7c5] leading-[1.65]">
                  <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">
                    Verification in progress ({billingCounts.pending} pending):
                  </strong>{' '}
                  Our team verifies bKash, Nagad, and Rocket TrxID submissions shortly. Your plan unlocks automatically once approved.
                </p>
              </div>
            )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in" data-testid="account-tab-overview">
              {/* Top 3 KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6]">
                      Current Plan
                    </span>
                    <span
                      className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full border ${
                        summary.isActive
                          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-black/[0.08] dark:border-white/[0.1] bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6]'
                      }`}
                    >
                      {summary.isActive ? 'Active' : 'Free Tier'}
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                      {summary.planLabel}
                    </div>
                    <div className="text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6] mt-0.5 truncate">
                      {summary.isActive ? `Expires ${summary.expiresAtLabel}` : 'Unlock Monthly ৳699'}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6]">
                      Remaining Quota
                    </span>
                    <span className="text-[10.5px] font-mono tabular-nums text-[#444746] dark:text-[#9aa0a6]">
                      {summary.usagePercent}% used
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-base font-semibold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]">
                      {summary.remainingTokens.toLocaleString()}
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-black/[0.08] dark:bg-white/[0.1] overflow-hidden">
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
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6]">
                      Account Security
                    </span>
                    <span
                      className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full border ${
                        securityChecklist.isComplete
                          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {securityChecklist.isComplete ? 'Secured' : 'Setup'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                      {securityChecklist.statusLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectSection('security')}
                      className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] underline hover:opacity-80 shrink-0 cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>

              {/* Subscription & Upgrade Action Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="space-y-1 min-w-0">
                  <h4 className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {summary.isActive
                      ? `${summary.planLabel}${summary.planAmountLabel && !summary.planLabel.includes(summary.planAmountLabel) ? ` · ${summary.planAmountLabel}` : ''}`
                      : 'Activate Full Frontier Model Access'}
                  </h4>
                  <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-relaxed">
                    {summary.isActive
                      ? 'Switch between Monthly (৳699) and Yearly (৳5,999) or extend your token balance anytime.'
                      : 'Unlock Claude Fable 5.2, GPT-6 Astra, Gemini 4 Carbon & Grok 4.7 via bKash, Nagad, or Rocket.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <WatchTutorialButton
                    variant="outline"
                    size="sm"
                    testId="tutorial-btn-account"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onCloseModal?.();
                      openCheckout('monthly');
                    }}
                    className="h-9 px-5 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{summary.actionLabel}</span>
                  </button>
                </div>
              </div>

              {/* Security Setup Prompt (when missing Email, Password, or Google Link) */}
              {!securityChecklist.isComplete && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1e1f20] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                      <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Finish Securing Your Account ({securityChecklist.missingCount} left)</span>
                    </div>
                    <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-relaxed">
                      {[
                        securityChecklist.needsEmail ? 'Add Email' : null,
                        !securityChecklist.hasPassword ? 'Set Password' : null,
                        !securityChecklist.googleLinked ? 'Bind Google' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}{' '}
                      so you never lose access to your plan or billing receipts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('security')}
                    className="h-8 px-4 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] hover:bg-[#e9eef6] dark:hover:bg-[#333639] border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Complete Setup</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Recent Payments Preview */}
              <div className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
                <div className="px-4 sm:px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                    Recent Orders
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('billing')}
                    className="text-xs font-medium text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All ({billingCounts.all})</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {loadingPayments ? (
                  <div className="py-6 text-center text-xs text-[#444746] dark:text-[#9aa0a6]">
                    Loading orders...
                  </div>
                ) : payments.length === 0 ? (
                  <div className="py-6 px-4 text-center text-xs text-[#444746] dark:text-[#9aa0a6]">
                    No transactions recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                    {payments.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] uppercase font-mono truncate">
                            {p.gateway} · {p.trx_id}
                          </div>
                          <div className="text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6] tabular-nums">
                            {new Date(p.created_at).toLocaleDateString('en-US')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-semibold font-mono tabular-nums text-[#1f1f1f] dark:text-[#e3e3e3]">
                            {formatBDT(p.amount)}
                          </span>
                          {renderStatusBadge(p.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SUBSCRIPTION & QUOTA */}
          {activeTab === 'subscription' && (
            <div className="space-y-4 animate-in fade-in" data-testid="account-tab-subscription">
              <div className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <span className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                    Plan Details
                  </span>
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

                {/* Token Quota Bar */}
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
                  <div className="w-full h-2.5 rounded-full bg-black/[0.08] dark:bg-white/[0.1] overflow-hidden">
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
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <WatchTutorialButton
                      variant="outline"
                      size="sm"
                      testId="tutorial-btn-account"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onCloseModal?.();
                        openCheckout('monthly');
                      }}
                      className="h-9 px-5 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{summary.actionLabel}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BILLING HISTORY */}
          {activeTab === 'billing' && (
            <div className="space-y-4 animate-in fade-in" data-testid="account-tab-billing">
              {/* Filter Pills & TrxID Search */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'All', count: billingCounts.all },
                      { id: 'approved', label: 'Approved', count: billingCounts.approved },
                      { id: 'pending', label: 'Pending', count: billingCounts.pending },
                      { id: 'rejected', label: 'Rejected', count: billingCounts.rejected },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPaymentFilter(f.id)}
                      className={`h-7 px-3 rounded-full text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        paymentFilter === f.id
                          ? 'bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold'
                          : 'bg-[#f0f4f9] dark:bg-[#131314] text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                      }`}
                    >
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-52 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#444746] dark:text-[#9aa0a6]" />
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    placeholder="Search TrxID or gateway..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
                {loadingPayments ? (
                  <div className="py-10 text-center text-xs text-[#444746] dark:text-[#9aa0a6]">
                    Loading billing history...
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="py-10 px-4 text-center space-y-3">
                    <p className="text-xs text-[#444746] dark:text-[#9aa0a6]">
                      {payments.length === 0
                        ? 'No bKash, Nagad, or Rocket transactions recorded yet.'
                        : 'No transactions match your current filter.'}
                    </p>
                    {payments.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          onCloseModal?.();
                          openCheckout('monthly');
                        }}
                        className="h-8 px-4 rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#131314] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Subscribe (৳699/mo)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Mobile Cards */}
                    <div className="sm:hidden divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      {filteredPayments.map((p) => (
                        <div key={p.id} className="p-4 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] uppercase font-mono tabular-nums">
                              {p.gateway} · {formatBDT(p.amount)}
                            </span>
                            {renderStatusBadge(p.status)}
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6]">
                            <button
                              type="button"
                              onClick={() => handleCopyTrx(p.trx_id, p.id)}
                              className="inline-flex items-center gap-1 truncate hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
                              title="Copy TrxID"
                            >
                              <span className="truncate">TrxID: {p.trx_id}</span>
                              {copiedId === p.id ? (
                                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                              ) : (
                                <Copy className="w-3 h-3 shrink-0" />
                              )}
                            </button>
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
                        <thead className="border-b border-black/[0.06] dark:border-white/[0.08] bg-[#f0f4f9]/70 dark:bg-[#131314]/60 text-[#444746] dark:text-[#9aa0a6] font-mono text-[11px]">
                          <tr>
                            <th className="py-3 px-4 font-medium">Date</th>
                            <th className="py-3 px-4 font-medium">Gateway</th>
                            <th className="py-3 px-4 font-medium">Transaction ID</th>
                            <th className="py-3 px-4 font-medium text-right">Amount</th>
                            <th className="py-3 px-4 font-medium text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06] font-mono text-[11.5px] tabular-nums">
                          {filteredPayments.map((p) => (
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
                                <button
                                  type="button"
                                  onClick={() => handleCopyTrx(p.trx_id, p.id)}
                                  className="inline-flex items-center gap-1.5 hover:opacity-80 cursor-pointer"
                                  title="Copy Transaction ID"
                                >
                                  <span>{p.trx_id}</span>
                                  {copiedId === p.id ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-[#444746] dark:text-[#9aa0a6]" />
                                  )}
                                </button>
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
            </div>
          )}

          {/* TAB 3B: DEVELOPER API KEYS */}
          {activeTab === 'api_keys' && <DeveloperApiKeysTab token={token} />}

          {/* TAB 4: ACCOUNT & SECURITY */}
          {activeTab === 'security' && (
            <div
              className="space-y-4 animate-in fade-in"
              data-testid="account-security-section"
            >
              {/* Identity Summary Card */}
              <div className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <UserAvatar
                    user={user}
                    sizeClassName="w-11 h-11 text-sm"
                    imgClassName="border border-black/[0.08] dark:border-white/[0.1]"
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
                      {securityChecklist.needsEmail
                        ? user.phone
                          ? `Phone: ${user.phone}`
                          : 'Phone Account'
                        : user.email}
                      {!securityChecklist.needsEmail && user.phone ? ` · ${user.phone}` : ''}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border shrink-0 ${
                    securityChecklist.isComplete
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {securityChecklist.isComplete ? 'Fully Secured' : 'Recommended Setup'}
                </span>
              </div>

              {/* Security Credentials Panel */}
              <div className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 space-y-4">
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

                {(securityChecklist.needsEmail || !securityChecklist.hasPassword) && (
                  <p className="text-xs text-[#444746] dark:text-[#9aa0a6] leading-relaxed">
                    Add an email, set a password, or bind your Google account below so you can easily log back in from any browser and receive payment receipts.
                  </p>
                )}

                {/* Row 1: Email */}
                <div className="pt-1">
                  {securityChecklist.needsEmail ? (
                    <form onSubmit={handleSaveEmail} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                        Add Email Address{' '}
                        <span className="font-normal text-[#444746] dark:text-[#9aa0a6]">
                          (For receipts &amp; OTP recovery)
                        </span>
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                          <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-[#444746] dark:text-[#9aa0a6]" />
                          <input
                            type="email"
                            required
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="yourname@gmail.com"
                            data-testid="account-add-email-input"
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9]/70 dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
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
                        <span>
                          Recovery Email:{' '}
                          <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">
                            {user.email}
                          </strong>
                        </span>
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
                  {!securityChecklist.hasPassword ? (
                    <form onSubmit={handleSavePassword} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                        Set Account Password{' '}
                        <span className="font-normal text-[#444746] dark:text-[#9aa0a6]">
                          (Sign in anytime with phone or email)
                        </span>
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                          <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-[#444746] dark:text-[#9aa0a6]" />
                          <input
                            type="password"
                            required
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="Create password (min 6 characters)"
                            data-testid="account-set-password-input"
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9]/70 dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
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

                {/* Row 3: Bind with Google */}
                <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                      Google Account Sign-In
                    </p>
                    <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] mt-0.5">
                      {securityChecklist.googleLinked
                        ? 'Linked! You can sign in with 1 click using Google anytime.'
                        : 'Connect Google so you can access this exact plan & history with 1 click.'}
                    </p>
                    {!securityChecklist.googleLinked &&
                      isFbIab &&
                      isAndroid &&
                      typeof window !== 'undefined' && (
                        <a
                          href={buildAndroidChromeIntentUrl(window.location.href)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] underline mt-1"
                        >
                          <span>Open in Chrome to bind Google</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                  </div>

                  {securityChecklist.googleLinked ? (
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
                      className="h-9 px-4 rounded-full font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] border border-black/[0.1] dark:border-white/[0.12] transition-colors inline-flex items-center justify-center gap-2 shrink-0 disabled:opacity-60 cursor-pointer self-start sm:self-auto"
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
            </div>
          )}

          {/* TAB 5: APPEARANCE & PLATFORM LINKS */}
          {activeTab === 'preferences' && (
            <div className="space-y-4 animate-in fade-in" data-testid="account-tab-preferences">
              {/* Theme Switcher Card */}
              <div className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                    Interface Appearance
                  </h4>
                  <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-0.5 leading-relaxed">
                    Choose how Bangla AI renders across the homepage and AI Workspace.
                  </p>
                </div>

                <div
                  role="radiogroup"
                  aria-label="Theme preference"
                  className="shrink-0 w-full sm:w-56 grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08]"
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

              {/* Workspace Shortcuts */}
              <div className="rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 space-y-3">
                <h4 className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Quick Platform Shortcuts
                </h4>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {onNavigateChat && (
                      <button
                        type="button"
                        onClick={() => {
                          onCloseModal?.();
                          onNavigateChat();
                        }}
                        className="h-9 px-3.5 rounded-full bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
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
                        className="h-9 px-3.5 rounded-full bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
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
                        className="h-9 px-3.5 rounded-full bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Home className="w-3.5 h-3.5" />
                        <span>Homepage</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onCloseModal?.();
                      logout();
                    }}
                    className="h-9 px-3.5 rounded-full text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Quick Footer Actions (only inside modal when mobile sidebar is hidden) */}
          {(onNavigateChat || onNavigateHome || (user.role === 'admin' && onNavigateAdmin) || onCloseModal) && (
            <div
              className={`${
                compact ? 'md:hidden' : 'lg:hidden'
              } pt-2 border-t border-black/[0.08] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {onNavigateChat && (
                  <button
                    type="button"
                    onClick={() => {
                      onCloseModal?.();
                      onNavigateChat();
                    }}
                    className="h-8 px-3 rounded-full bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                    <span>Workspace</span>
                  </button>
                )}
                {onNavigateHome && (
                  <button
                    type="button"
                    onClick={() => {
                      onCloseModal?.();
                      onNavigateHome();
                    }}
                    className="h-8 px-3 rounded-full bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium text-[#444746] dark:text-[#9aa0a6] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Home</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  onCloseModal?.();
                  logout();
                }}
                className="h-8 px-3 rounded-full text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
