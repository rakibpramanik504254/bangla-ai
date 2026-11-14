import React, { useEffect } from 'react';
import {
  ChevronDown,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Shield,
  Tag,
  User as UserIcon,
  X,
} from 'lucide-react';
import { User } from '../../types/index.ts';
import { AppView, getAccountRoleLabel } from '../../utils/navigation.ts';
import { UserAvatar } from './UserAvatar.tsx';

interface MobileProfileTriggerButtonProps {
  user: User;
  isOpen: boolean;
  onClick: () => void;
  compactName?: boolean;
}

export const MobileProfileTriggerButton: React.FC<MobileProfileTriggerButtonProps> = ({
  user,
  isOpen,
  onClick,
  compactName = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open account and navigation menu"
      aria-expanded={isOpen}
      data-testid="mobile-unified-menu-trigger"
      className="md:hidden h-9 pl-1.5 pr-2.5 rounded-full bg-[#f0f4f9] dark:bg-[#1e1f20] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.08] text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
    >
      <UserAvatar
        user={user}
        sizeClassName="w-6 h-6 text-[11px]"
        testId="mobile-trigger-user-avatar"
      />
      <span
        className={`text-xs font-medium truncate ${
          compactName ? 'max-w-[72px]' : 'max-w-[90px]'
        }`}
      >
        {user.name.split(' ')[0]}
      </span>
      {compactName ? (
        <ChevronDown className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6] shrink-0" />
      ) : (
        <Menu className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6] shrink-0" />
      )}
    </button>
  );
};

interface MobileProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  currentView: AppView;
  onNavigateChat: () => void;
  onNavigateAdmin: () => void;
  onNavigateHome: () => void;
  onOpenAccount: () => void;
  onSignOut: () => void;
  onScrollToSection?: (sectionId: string) => void;
}

export const MobileProfileDrawer: React.FC<MobileProfileDrawerProps> = ({
  isOpen,
  onClose,
  user,
  currentView,
  onNavigateChat,
  onNavigateAdmin,
  onNavigateHome,
  onOpenAccount,
  onSignOut,
  onScrollToSection,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isAdmin = user.role === 'admin';
  const roleLabel = getAccountRoleLabel(user);
  const remainingTokens = Math.max(
    0,
    (user.usage_limit || 0) - (user.current_usage || 0)
  );

  return (
    <div
      className="fixed inset-0 z-50 md:hidden flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile account and navigation menu"
      data-testid="mobile-unified-drawer"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[1px] animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right-Side Slide-Over Drawer */}
      <div className="relative z-10 w-[300px] max-w-[88vw] h-full bg-white dark:bg-[#1e1f20] border-l border-black/[0.08] dark:border-white/[0.08] shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right">
        {/* 1. User Identity Header */}
        <div className="p-4 border-b border-black/[0.08] dark:border-white/[0.08] space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar
                user={user}
                sizeClassName="w-10 h-10 text-sm"
                imgClassName="border border-black/[0.08] dark:border-white/[0.1]"
                testId="mobile-drawer-user-avatar"
              />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                  {user.name}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08] text-[10.5px] font-medium text-[#444746] dark:text-[#9aa0a6]">
                  {roleLabel}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#444746] dark:text-[#9aa0a6] truncate">
            {user.email}
          </p>

          <div className="px-3 py-2 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-xs font-mono tabular-nums">
            <span className="text-[#444746] dark:text-[#9aa0a6]">Remaining</span>
            <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
              {remainingTokens.toLocaleString()} tokens
            </span>
          </div>
        </div>

        {/* 2. Quick Navigation */}
        <div className="p-3 space-y-1.5 border-b border-black/[0.08] dark:border-white/[0.08]">
          {currentView !== 'chat' && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateChat();
              }}
              className="w-full h-11 px-4 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer mb-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span>AI Workspace</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateAdmin();
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-left text-sm font-medium flex items-center gap-3 transition-colors cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold'
                  : 'text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
              }`}
            >
              <Shield className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6]" />
              <span>Admin Console</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateHome();
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl text-left text-sm flex items-center gap-3 transition-colors cursor-pointer ${
              currentView === 'home'
                ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold'
                : 'text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home / Overview</span>
          </button>

          {onScrollToSection && (
            <>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onScrollToSection('pricing');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl text-left text-sm text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] flex items-center gap-3 transition-colors cursor-pointer"
              >
                <Tag className="w-4 h-4" />
                <span>Pricing</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onScrollToSection('faq');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl text-left text-sm text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] flex items-center gap-3 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>FAQ</span>
              </button>
            </>
          )}
        </div>

        {/* 3. Unified Account Panel */}
        <div className="p-3 flex-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAccount();
            }}
            className="w-full px-3.5 py-2.5 rounded-xl text-left text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center gap-3 transition-colors cursor-pointer"
          >
            <UserIcon className="w-4 h-4 text-[#444746] dark:text-[#9aa0a6]" />
            <span>Account &amp; Billing</span>
          </button>
        </div>

        {/* 4. Footer Action */}
        <div className="p-3 border-t border-black/[0.08] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full px-3.5 py-2.5 rounded-xl text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50/70 dark:hover:bg-red-950/20 flex items-center gap-3 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
