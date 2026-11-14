import React, { useEffect } from 'react';
import {
  X,
  Sun,
  Moon,
  CreditCard,
  Home,
  Shield,
  LogOut,
  User as UserIcon,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateHome?: () => void;
  onNavigateAccount?: () => void;
  onNavigateAdmin?: () => void;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  isOpen,
  onClose,
  onNavigateHome,
  onNavigateAccount,
  onNavigateAdmin,
}) => {
  const { user, theme, setTheme, openPaymentModal, logout } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSubscribed = Boolean(user?.isSubscribed || user?.role === 'admin');
  const limit = user?.usage_limit || 0;
  const used = user?.current_usage || 0;
  const remaining = Math.max(0, limit - used);
  const usedPercent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account Settings"
      data-testid="workspace-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden text-[#1f1f1f] dark:text-[#e3e3e3]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight">
              Account &amp; Settings
            </h2>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] truncate">
              {user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-[#9aa0a6] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Profile Overview */}
          <div className="flex items-center gap-3.5">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-11 h-11 rounded-full object-cover border border-black/10 dark:border-white/15 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold text-sm flex items-center justify-center shrink-0">
                {(user?.name || 'U').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{user?.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#f0f4f9] dark:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5]">
                  {user?.role === 'admin' ? 'Admin' : isSubscribed ? 'Pro Plan' : 'Free Tier'}
                </span>
              </div>
              <p className="text-xs text-[#444746] dark:text-[#9aa0a6] truncate mt-0.5">
                {user?.subscription?.plan_name || (isSubscribed ? 'Active Workspace Access' : 'No active subscription')}
              </p>
            </div>
          </div>

          {/* Appearance / Theme Switcher (Strict single location for workspace) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#444746] dark:text-[#9aa0a6]">
                Appearance
              </span>
              <span className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                Saved automatically
              </span>
            </div>
            <div
              role="radiogroup"
              aria-label="Theme preference"
              className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08]"
            >
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'light'}
                data-testid="settings-theme-light"
                onClick={() => setTheme('light')}
                className={`h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-[#1f1f1f] shadow-xs border border-black/[0.06]'
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
                className={`h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#282a2c] text-[#e3e3e3] shadow-xs border border-white/[0.08]'
                    : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>

          {/* Token Usage & Plan */}
          <div className="p-3.5 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                Token Quota
              </span>
              <span className="font-mono text-[11.5px] tabular-nums text-[#444746] dark:text-[#9aa0a6]">
                {limit > 0
                  ? `${remaining.toLocaleString()} / ${limit.toLocaleString()} left`
                  : '0 tokens'}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-black/[0.08] dark:bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1f1f1f] dark:bg-[#e3e3e3] transition-all duration-300"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                openPaymentModal('monthly');
              }}
              className="w-full h-9 rounded-lg bg-[#1f1f1f] hover:bg-[#333333] dark:bg-[#e3e3e3] dark:hover:bg-white text-white dark:text-[#131314] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isSubscribed ? 'Renew or Upgrade Plan' : 'Subscribe (৳699/mo)'}</span>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1 pt-1 border-t border-black/[0.08] dark:border-white/[0.08]">
            {onNavigateAccount && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateAccount();
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                  <span>Full Account &amp; Billing History</span>
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
              </button>
            )}

            {onNavigateHome && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateHome();
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Home className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                  <span>Bangla-AI.pro Homepage</span>
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
              </button>
            )}

            {user?.role === 'admin' && onNavigateAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateAdmin();
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Shield className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                  <span>Admin Console</span>
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                logout();
              }}
              className="w-full px-3 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
