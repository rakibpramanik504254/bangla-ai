import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  Download,
  ExternalLink,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Shield,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useAppInstall } from '../context/AppInstallContext.tsx';
import { BrandLogo } from './common/BrandLogo.tsx';
import { UserAvatar } from './common/UserAvatar.tsx';
import {
  MobileProfileDrawer,
  MobileProfileTriggerButton,
} from './common/MobileProfileDrawer.tsx';
import {
  AppView,
  getAccountRoleLabel,
  getDesktopNavItems,
} from '../utils/navigation.ts';
import {
  buildAndroidChromeIntentUrl,
  formatUserContactSubtitle,
  isAndroidUserAgent,
  isFacebookInAppBrowser,
} from '../utils/expressCheckout.ts';

interface NavbarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { user, theme, setTheme, loginWithGoogle, logout, openAuthModal, openAccountModal, openPaymentModal } = useAuth();
  const { isInstalled, triggerInstall } = useAppInstall();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [mobileGoogleError, setMobileGoogleError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isFbInAppBrowser =
    typeof navigator !== 'undefined' && isFacebookInAppBrowser(navigator.userAgent);
  const isAndroid =
    typeof navigator !== 'undefined' && isAndroidUserAgent(navigator.userAgent);

  const handleMobileGoogleSignIn = async () => {
    setMobileGoogleError(null);
    setGoogleSigningIn(true);
    try {
      await loginWithGoogle();
      setMobileDrawerOpen(false);
    } catch (err: any) {
      setMobileGoogleError(err?.message || 'Google sign-in failed. Try Express Checkout or open in Chrome.');
    } finally {
      setGoogleSigningIn(false);
    }
  };

  const remainingTokens = user
    ? Math.max(0, (user.usage_limit || 0) - (user.current_usage || 0))
    : 0;
  const desktopNavItems = getDesktopNavItems(user);
  const roleLabel = getAccountRoleLabel(user);
  const isAdmin = user?.role === 'admin';

  // Close menus cleanly when auth state changes
  useEffect(() => {
    setDropdownOpen(false);
    setMobileDrawerOpen(false);
    setMobileGoogleError(null);
  }, [Boolean(user)]);

  // Close desktop dropdown on outside click or Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [dropdownOpen]);

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [mobileDrawerOpen]);

  const scrollToSection = (sectionId: string) => {
    setMobileDrawerOpen(false);
    setDropdownOpen(false);
    if (currentView === 'home') {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setCurrentView('home');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    }
  };

  const navigateTo = (view: AppView) => {
    setMobileDrawerOpen(false);
    setDropdownOpen(false);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (id: 'overview' | 'chat' | 'admin' | 'pricing' | 'faq') => {
    if (id === 'overview') {
      navigateTo('home');
    } else if (id === 'chat') {
      navigateTo('chat');
    } else if (id === 'admin') {
      navigateTo('admin');
    } else if (id === 'pricing') {
      scrollToSection('pricing');
    } else if (id === 'faq') {
      scrollToSection('faq');
    }
  };

  const isNavItemActive = (id: 'overview' | 'chat' | 'admin' | 'pricing' | 'faq') => {
    if (id === 'overview') return currentView === 'home';
    if (id === 'chat') return currentView === 'chat';
    if (id === 'admin') return currentView === 'admin';
    return false;
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-black/[0.08] dark:border-white/[0.08] bg-white/90 dark:bg-[#131314]/90 backdrop-blur-md transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="flex items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f] dark:focus-visible:outline-[#e3e3e3] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BrandLogo className="w-7 h-7 shrink-0" />
            <span className="text-[15px] sm:text-base font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
              Bangla AI
            </span>
          </button>

          {/* Zone 2: Desktop Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-1.5 text-sm font-medium text-[#444746] dark:text-[#9aa0a6]"
          >
            {desktopNavItems.map((item) => {
              const active = isNavItemActive(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold'
                      : 'hover:bg-[#f0f4f9] dark:hover:bg-[#1e1f20] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Right Actions (Single trigger per viewport & auth state) */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <>
                {/* Desktop: Single User Profile Pill + Sleek Dropdown */}
                <div ref={dropdownRef} className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    aria-label="Account menu"
                    aria-expanded={dropdownOpen}
                    aria-haspopup="menu"
                    data-testid="desktop-profile-trigger"
                    className="btn-pill-secondary !min-h-0 !h-9 !py-0 !pl-1.5 !pr-3 gap-2 !whitespace-nowrap"
                  >
                    <UserAvatar
                      user={user}
                      sizeClassName="w-6 h-6 text-[11px]"
                      testId="desktop-header-user-avatar"
                    />
                    <span className="text-xs font-medium truncate max-w-[110px]">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6] shrink-0 transition-transform duration-150 ${
                        dropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div
                      role="menu"
                      aria-label="User profile menu"
                      data-testid="desktop-profile-dropdown"
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] shadow-xl py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1"
                    >
                      {/* User Summary Header */}
                      <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                            {user.name}
                          </p>
                          <span className="text-[10px] font-medium text-[#444746] dark:text-[#9aa0a6] shrink-0">
                            {roleLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] truncate">
                          {formatUserContactSubtitle(user)}
                        </p>
                        <div className="pt-1 text-[11px] text-[#444746] dark:text-[#9aa0a6] flex items-center justify-between font-mono tabular-nums">
                          <span>Remaining tokens</span>
                          <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                            {remainingTokens.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => navigateTo('chat')}
                          className="w-full text-left px-4 py-2 text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                          <span>AI Workspace</span>
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => navigateTo('admin')}
                            className="w-full text-left px-4 py-2 text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                          >
                            <Shield className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                            <span>Admin Console</span>
                          </button>
                        )}

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setDropdownOpen(false);
                            openAccountModal();
                          }}
                          className="w-full text-left px-4 py-2 text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-[#444746] dark:text-[#9aa0a6]" />
                          <span>Account &amp; Billing</span>
                        </button>
                      </div>

                      <div className="border-t border-black/[0.06] dark:border-white/[0.08] mt-1 pt-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setDropdownOpen(false);
                            logout();
                          }}
                          className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50/70 dark:hover:bg-red-950/20 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile (< md): SINGLE Menu Trigger (User Avatar Pill + Menu indicator, NO separate 3-bar button) */}
                <MobileProfileTriggerButton
                  user={user}
                  isOpen={mobileDrawerOpen}
                  onClick={() => setMobileDrawerOpen(true)}
                />
              </>
            ) : (
              <>
                {/* Desktop: Sign In + Get Started */}
                <div className="hidden md:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="btn-pill-secondary !min-h-0 !h-9 !py-0 !px-4 !text-xs !whitespace-nowrap"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('register')}
                    className="btn-pill-primary !min-h-0 !h-9 !py-0 !px-4 !text-xs !whitespace-nowrap"
                  >
                    Get Started
                  </button>
                </div>

                {/* Mobile (< md): Single 3-bar Menu Trigger when Logged Out */}
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen((prev) => !prev)}
                  aria-label={mobileDrawerOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={mobileDrawerOpen}
                  data-testid="mobile-guest-menu-trigger"
                  className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3] bg-[#f0f4f9] dark:bg-[#1e1f20] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] border border-black/[0.06] dark:border-white/[0.08] shrink-0 transition-colors cursor-pointer"
                >
                  {mobileDrawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Logged-In Mobile Unified Slide-Over Drawer (Shared with AI Workspace) */}
      {user && (
        <MobileProfileDrawer
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          user={user}
          currentView={currentView}
          onNavigateChat={() => navigateTo('chat')}
          onNavigateAdmin={() => navigateTo('admin')}
          onNavigateHome={() => navigateTo('home')}
          onOpenAccount={() => openAccountModal()}
          onSignOut={() => logout()}
          onScrollToSection={scrollToSection}
        />
      )}

      {/* Logged-Out Mobile Slide-Over Drawer */}
      {!user && mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          data-testid="mobile-unified-drawer"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[1px] animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <div className="relative z-10 w-[300px] max-w-[88vw] h-full bg-white dark:bg-[#1e1f20] border-l border-black/[0.08] dark:border-white/[0.08] shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right">
            <div className="px-4 h-16 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrandLogo className="w-6 h-6" />
                <span className="text-sm font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Bangla AI
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close menu"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav aria-label="Mobile guest links" className="p-3 space-y-1 flex-1">
              <button
                type="button"
                onClick={() => navigateTo('home')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-left text-sm transition-colors cursor-pointer ${
                  currentView === 'home'
                    ? 'bg-[#e9eef6] dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold'
                    : 'text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
                }`}
              >
                Overview
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('pricing')}
                className="w-full px-3.5 py-2.5 rounded-xl text-left text-sm text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] transition-colors cursor-pointer"
              >
                Pricing
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('faq')}
                className="w-full px-3.5 py-2.5 rounded-xl text-left text-sm text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] transition-colors cursor-pointer"
              >
                FAQ
              </button>
            </nav>

            {/* Appearance / Theme Switcher (Synced with Account & Billing global state) */}
            <div
              data-testid="guest-drawer-appearance"
              className="px-4 py-3.5 border-t border-black/[0.08] dark:border-white/[0.08] space-y-2.5"
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
                Appearance
              </span>
              <div
                role="radiogroup"
                aria-label="Theme preference"
                className="grid grid-cols-2 gap-1 p-1 rounded-full bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08]"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === 'light'}
                  data-testid="guest-drawer-theme-light"
                  onClick={() => setTheme('light')}
                  className={`h-8 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
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
                  data-testid="guest-drawer-theme-dark"
                  onClick={() => setTheme('dark')}
                  className={`h-8 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
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

            <div className="p-4 border-t border-black/[0.08] dark:border-white/[0.08] space-y-2.5">
              {mobileGoogleError && (
                <div className="p-2.5 text-[11px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 rounded-xl flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="leading-snug">{mobileGoogleError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleMobileGoogleSignIn}
                disabled={googleSigningIn}
                data-testid="mobile-sidebar-google-signin"
                className="w-full h-10 px-4 rounded-full font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.08] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {googleSigningIn ? (
                  <span className="w-3.5 h-3.5 border-2 border-[#1f1f1f] dark:border-[#e3e3e3] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                <span>Sign in with Google</span>
              </button>

              {isFbInAppBrowser && isAndroid && typeof window !== 'undefined' && (
                <a
                  href={buildAndroidChromeIntentUrl(window.location.href)}
                  className="w-full h-9 px-3 rounded-full text-[11px] font-medium text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span>Open in Chrome for 1-Tap Google</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  openAuthModal('login');
                }}
                className="btn-pill-secondary w-full h-10 text-xs"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  openPaymentModal('monthly');
                }}
                data-testid="mobile-guest-get-started-btn"
                className="btn-pill-primary w-full h-10 text-xs"
              >
                Get Started
              </button>

              {!isInstalled && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    triggerInstall();
                  }}
                  data-testid="mobile-guest-download-app-btn"
                  className="btn-pill-secondary w-full h-10 text-xs font-medium justify-center"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Download App</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
