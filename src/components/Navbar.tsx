import React, { useState } from 'react';
import {
  MessageSquare,
  User,
  Shield,
  CreditCard,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Lock,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { BrandLogo } from './common/BrandLogo.tsx';

interface NavbarProps {
  currentView: 'home' | 'chat' | 'account' | 'admin' | 'about' | 'privacy' | 'terms' | 'security';
  setCurrentView: (view: 'home' | 'chat' | 'account' | 'admin' | 'about' | 'privacy' | 'terms' | 'security') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { user, logout, theme, toggleTheme, openAuthModal, openPaymentModal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const remainingTokens = user ? Math.max(0, user.usage_limit - user.current_usage) : 0;
  const isSubscribed = user?.isSubscribed || user?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#1F1F1F]/95 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <button
            onClick={() => {
              setCurrentView('home');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-1.5 sm:gap-2 text-left group focus:outline-none whitespace-nowrap"
          >
            <BrandLogo className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="text-sm sm:text-base font-bold tracking-tight text-black dark:text-white">
              Bangla AI
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links (OpenAI Minimal Sentence Case) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-400">
          <button
            onClick={() => setCurrentView('home')}
            className={`transition-colors whitespace-nowrap ${
              currentView === 'home'
                ? 'text-black dark:text-white font-semibold'
                : 'hover:text-black dark:hover:text-white'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => {
              if (currentView === 'home') {
                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
              } else {
                setCurrentView('home');
                setTimeout(() => {
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="hover:text-black dark:hover:text-white transition-colors whitespace-nowrap"
          >
            Pricing
          </button>

          <button
            onClick={() => setCurrentView('about')}
            className={`transition-colors whitespace-nowrap ${
              currentView === 'about'
                ? 'text-black dark:text-white font-semibold'
                : 'hover:text-black dark:hover:text-white'
            }`}
          >
            About
          </button>

          <button
            onClick={() => setCurrentView('privacy')}
            className={`transition-colors whitespace-nowrap ${
              currentView === 'privacy'
                ? 'text-black dark:text-white font-semibold'
                : 'hover:text-black dark:hover:text-white'
            }`}
          >
            Privacy
          </button>

          <button
            onClick={() => {
              if (!user) {
                openAuthModal('login');
              } else if (!isSubscribed) {
                openPaymentModal('monthly');
              } else {
                setCurrentView('chat');
              }
            }}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              currentView === 'chat'
                ? 'text-black dark:text-white font-semibold'
                : 'hover:text-black dark:hover:text-white'
            }`}
          >
            <span>Workspace</span>
            {!isSubscribed && <Lock className="w-3 h-3 text-gray-400" />}
          </button>
        </nav>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Minimal Icon Button (Theme Toggle) */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="btn-pill-secondary !min-h-0 !h-8 sm:!h-9 !py-0 !px-2 sm:!px-3 gap-1.5 sm:gap-2 !whitespace-nowrap"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold text-[10px] flex items-center justify-center shrink-0">
                    {user.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium truncate max-w-[60px] sm:max-w-[90px]">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
              </button>

              {/* User Dropdown */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-xl bg-white dark:bg-[#262626] border border-black/10 dark:border-white/10 shadow-lg py-1.5 z-50 text-xs"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                    <p className="font-semibold text-black dark:text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                    <div className="mt-1.5 text-[11px] text-gray-500 flex items-center justify-between font-mono">
                      <span>Remaining:</span>
                      <span className="font-semibold text-black dark:text-white">
                        {remainingTokens.toLocaleString()} tokens
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentView('account')}
                    className="w-full text-left px-3.5 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800/60 flex items-center gap-2 transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>Account & Billing</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!isSubscribed) {
                        openPaymentModal('monthly');
                      } else {
                        setCurrentView('account');
                      }
                    }}
                    className="w-full text-left px-3.5 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800/60 flex items-center gap-2 transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                    <span>{isSubscribed ? 'Subscription Details' : 'Upgrade Plan (৳699)'}</span>
                  </button>

                  {user.role === 'admin' && (
                    <button
                      onClick={() => setCurrentView('admin')}
                      className="w-full text-left px-3.5 py-2 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-800/60 flex items-center gap-2 font-medium transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                      <span>Admin Console</span>
                    </button>
                  )}

                  <div className="border-t border-black/[0.06] dark:border-white/[0.06] mt-1 pt-1">
                    <button
                      onClick={logout}
                      className="w-full text-left px-3.5 py-2 text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => openAuthModal('login')}
                className="btn-pill-secondary !min-h-0 !h-8 sm:!h-9 !py-0 !px-2.5 sm:!px-3.5 !text-[11px] sm:!text-xs !whitespace-nowrap"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="btn-pill-primary !min-h-0 !h-8 sm:!h-9 !py-0 !px-2.5 sm:!px-4 !text-[11px] sm:!text-xs !whitespace-nowrap"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white shrink-0"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1F1F1F] px-4 py-4 space-y-2 text-sm">
          <button
            onClick={() => {
              setCurrentView('home');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            Overview
          </button>
          <button
            onClick={() => {
              setCurrentView('home');
              setMobileMenuOpen(false);
              setTimeout(() => {
                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            Pricing (৳699 & ৳5,999)
          </button>
          <button
            onClick={() => {
              setCurrentView('about');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            About
          </button>
          <button
            onClick={() => {
              setCurrentView('privacy');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            Privacy
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              if (!user) {
                openAuthModal('login');
              } else if (!isSubscribed) {
                openPaymentModal('monthly');
              } else {
                setCurrentView('chat');
              }
            }}
            className="w-full text-left px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              AI Workspace
            </span>
            {!isSubscribed && <Lock className="w-3.5 h-3.5 text-gray-400" />}
          </button>

          {user && user.role === 'admin' && (
            <button
              onClick={() => {
                setCurrentView('admin');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-black dark:text-white font-semibold flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-gray-500" />
              Admin Console
            </button>
          )}
        </div>
      )}
    </header>
  );
};
