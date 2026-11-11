import React, { useState } from 'react';
import {
  Sparkles,
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
import { formatBDT } from '../utils/billing.ts';

interface NavbarProps {
  currentView: 'home' | 'chat' | 'account' | 'admin' | 'about' | 'privacy';
  setCurrentView: (view: 'home' | 'chat' | 'account' | 'admin' | 'about' | 'privacy') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { user, logout, theme, toggleTheme, openAuthModal, openPaymentModal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const remainingTokens = user ? Math.max(0, user.usage_limit - user.current_usage) : 0;
  const isSubscribed = user?.isSubscribed || user?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo - Premium Minimal */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCurrentView('home');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 flex items-center justify-center font-bold text-sm tracking-tighter shadow-sm transition-transform group-hover:scale-105">
              BAI
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
                  Bangla AI
                </span>
                <span className="text-[10px] font-medium tracking-wide px-1.5 py-0.2 rounded-full border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block -mt-0.5 tracking-tight font-medium">
                Unified AI Hub
              </span>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
          <button
            onClick={() => setCurrentView('home')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              currentView === 'home'
                ? 'text-gray-950 dark:text-white font-semibold bg-gray-100/80 dark:bg-gray-800/60'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => {
              if (currentView === 'home') {
                document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
              } else {
                setCurrentView('home');
                setTimeout(() => {
                  document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all"
          >
            Pricing & Plans
          </button>

          <button
            onClick={() => setCurrentView('about')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              currentView === 'about'
                ? 'text-gray-950 dark:text-white font-semibold bg-gray-100/80 dark:bg-gray-800/60'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}
          >
            About Us
          </button>

          <button
            onClick={() => setCurrentView('privacy')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              currentView === 'privacy'
                ? 'text-gray-950 dark:text-white font-semibold bg-gray-100/80 dark:bg-gray-800/60'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}
          >
            Privacy Policy
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentView === 'chat'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-semibold shadow-xs'
                : 'border border-gray-200 dark:border-gray-700/80 text-gray-800 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Workspace</span>
            {!isSubscribed && <Lock className="w-3 h-3 text-amber-500 ml-0.5" />}
          </button>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 pr-2 rounded-full border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors bg-gray-50/50 dark:bg-gray-800/50"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-bold text-[11px] flex items-center justify-center">
                    {user.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-left text-[11px]">
                  <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[90px] leading-tight">
                    {user.name.split(' ')[0]}
                  </p>
                </div>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {/* User Dropdown */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 text-xs"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                    <div className="mt-2 text-[10px] flex items-center justify-between text-gray-500 bg-gray-50 dark:bg-gray-800/60 px-2 py-1 rounded-md font-mono">
                      <span>Tokens remaining:</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {remainingTokens.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentView('account')}
                    className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 flex items-center gap-2.5 transition-colors"
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
                    className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 flex items-center gap-2.5 transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                    <span>{isSubscribed ? 'Subscription Details' : 'Upgrade Plan (৳1,299)'}</span>
                  </button>

                  {user.role === 'admin' && (
                    <button
                      onClick={() => setCurrentView('admin')}
                      className="w-full text-left px-4 py-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 flex items-center gap-2.5 font-medium transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-500" />
                      <span>Admin Console</span>
                    </button>
                  )}

                  <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/30 flex items-center gap-2.5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('login')}
                className="text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="text-xs font-semibold bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 px-3.5 py-1.5 rounded-lg shadow-xs hover:shadow transition-all"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 space-y-2 animate-in slide-in-from-top-2 text-sm">
          <button
            onClick={() => {
              setCurrentView('home');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Overview
          </button>
          <button
            onClick={() => {
              setCurrentView('home');
              setMobileMenuOpen(false);
              setTimeout(() => {
                document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Pricing (৳1,299 & ৳9,999)
          </button>
          <button
            onClick={() => {
              setCurrentView('about');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            About Us
          </button>
          <button
            onClick={() => {
              setCurrentView('privacy');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Privacy Policy
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
            className="w-full text-left px-3 py-2 rounded-lg bg-gray-950 text-white dark:bg-white dark:text-gray-950 font-semibold flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              AI Workspace
            </span>
            {!isSubscribed && <Lock className="w-3.5 h-3.5 text-amber-400" />}
          </button>

          {user && user.role === 'admin' && (
            <button
              onClick={() => {
                setCurrentView('admin');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-amber-600 dark:text-amber-400 font-semibold bg-amber-50/50 dark:bg-amber-950/20 flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Admin Console
            </button>
          )}
        </div>
      )}
    </header>
  );
};
