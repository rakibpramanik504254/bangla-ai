import React, { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Mail, Lock, User as UserIcon, Phone, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { BrandLogo } from '../common/BrandLogo.tsx';
import { User } from '../../types/index.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
  onAuthSuccess?: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab, onAuthSuccess }) => {
  const { loginWithGoogle, login, register, authModalTab } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>(defaultTab || authModalTab || 'login');

  useEffect(() => {
    if (isOpen) {
      setTab(defaultTab || authModalTab || 'login');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, authModalTab, defaultTab]);

  // Manual inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Password reset flow
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<1 | 2>(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const authenticatedUser = await loginWithGoogle();
      onClose();
      onAuthSuccess?.(authenticatedUser);
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err.message || 'Failed to authenticate with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both email and password.');
        }
        const authenticatedUser = await login(email.trim(), password);
        onClose();
        onAuthSuccess?.(authenticatedUser);
      } else if (tab === 'register') {
        if (!name.trim() || !email.trim() || !password) {
          throw new Error('Please fill in all required fields.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        const authenticatedUser = await register(name.trim(), email.trim(), password, phone.trim());
        onClose();
        onAuthSuccess?.(authenticatedUser);
      } else if (tab === 'forgot') {
        if (resetStep === 1) {
          if (!email.trim()) {
            throw new Error('Please enter your account email.');
          }
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim() })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to request reset OTP');
          setSuccess(data.message + (data.demoOtp ? ` (OTP: ${data.demoOtp})` : ''));
          if (data.demoOtp) setResetToken(data.demoOtp);
          setResetStep(2);
        } else {
          if (!resetToken.trim() || !newPassword) {
            throw new Error('Please provide the OTP code and new password.');
          }
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), token: resetToken.trim(), newPassword })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Password reset failed');
          setSuccess(data.message);
          setTimeout(() => {
            setTab('login');
            setResetStep(1);
          }, 1500);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto my-auto bg-white dark:bg-[#1e1f20] rounded-3xl shadow-xl border border-black/[0.08] dark:border-white/[0.08]"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] transition-colors cursor-pointer z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="px-4 sm:px-6 pt-6 pb-4 border-b border-black/[0.08] dark:border-white/[0.08] text-center">
          <div className="mb-2.5 flex justify-center">
            <BrandLogo className="w-10 h-10" />
          </div>
          <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
            {tab === 'login' && 'Sign In to Bangla AI'}
            {tab === 'register' && 'Create Your Account'}
            {tab === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-xs text-[#444746] dark:text-[#9aa0a6] mt-1 max-w-xs mx-auto leading-[1.7]">
            {tab === 'forgot'
              ? 'Enter your email to receive a password reset code'
              : 'Unified access to frontier foundation models'}
          </p>

          {/* Switcher Tab */}
          {tab !== 'forgot' && (
            <div className="flex p-1 bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.06] rounded-full mt-4 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer ${
                  tab === 'login'
                    ? 'bg-white dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold shadow-2xs'
                    : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer ${
                  tab === 'register'
                    ? 'bg-white dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] font-semibold shadow-2xs'
                    : 'text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3]'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{success}</span>
            </div>
          )}

          {/* 1-Click Google Sign In */}
          {tab !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full h-11 px-4 rounded-full font-medium text-xs text-[#1f1f1f] dark:text-[#e3e3e3] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] border border-black/[0.08] dark:border-white/[0.08] transition-colors flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span className="font-semibold">
                  {tab === 'login' ? 'Continue with Google' : 'Sign up with Google'}
                </span>
              </button>

              {/* Minimal Divider */}
              <div className="relative flex items-center justify-center my-1">
                <div className="border-t border-black/[0.08] dark:border-white/[0.08] w-full" />
                <span className="bg-white dark:bg-[#1e1f20] px-3 text-[10px] text-[#444746] dark:text-[#9aa0a6] uppercase tracking-wider font-mono shrink-0">
                  or with email
                </span>
                <div className="border-t border-black/[0.08] dark:border-white/[0.08] w-full" />
              </div>
            </>
          )}

          {/* Manual Email & Password Form */}
          <form onSubmit={handleManualSubmit} className="space-y-3.5">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 absolute left-3.5 top-3 text-[#444746] dark:text-[#9aa0a6]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] placeholder:text-[#444746]/70 dark:placeholder:text-[#9aa0a6]/70 focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3.5 top-3 text-[#444746] dark:text-[#9aa0a6]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] placeholder:text-[#444746]/70 dark:placeholder:text-[#9aa0a6]/70 focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                />
              </div>
            </div>

            {tab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
                  Phone (Optional for MFS)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3.5 top-3 text-[#444746] dark:text-[#9aa0a6]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] placeholder:text-[#444746]/70 dark:placeholder:text-[#9aa0a6]/70 focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                  />
                </div>
              </div>
            )}

            {tab !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                    Password *
                  </label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab('forgot');
                        setError(null);
                        setSuccess(null);
                      }}
                      className="text-[11px] text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3.5 top-3 text-[#444746] dark:text-[#9aa0a6]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] placeholder:text-[#444746]/70 dark:placeholder:text-[#9aa0a6]/70 focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                  />
                </div>
              </div>
            )}

            {tab === 'forgot' && resetStep === 2 && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
                    Reset OTP Code *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 absolute left-3.5 top-3 text-[#444746] dark:text-[#9aa0a6]" />
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={e => setResetToken(e.target.value)}
                      placeholder="RESET-XXXXXX"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3.5 top-3 text-[#444746] dark:text-[#9aa0a6]" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3] transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 px-5 rounded-full font-semibold text-xs text-white dark:text-[#131314] bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white dark:border-[#131314] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {tab === 'login' && 'Sign In with Email'}
                    {tab === 'register' && 'Create Account'}
                    {tab === 'forgot' && (resetStep === 1 ? 'Send Reset OTP' : 'Update Password')}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {tab === 'forgot' && (
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError(null);
                  setSuccess(null);
                  setResetStep(1);
                }}
                className="w-full text-center text-[11px] text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] pt-1 cursor-pointer"
              >
                ← Back to Sign In
              </button>
            )}
          </form>

          {/* Security footnote */}
          <div className="pt-2 text-center border-t border-black/[0.08] dark:border-white/[0.08]">
            <div className="inline-flex items-center gap-1.5 text-[10px] text-[#444746] dark:text-[#9aa0a6] font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Firebase Verified & SHA-256 Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
