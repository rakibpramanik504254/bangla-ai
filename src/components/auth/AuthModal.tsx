import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab = 'login' }) => {
  const { loginWithGoogle, authModalTab } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab || authModalTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err.message || 'Failed to authenticate with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div 
        className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="px-6 pt-7 pb-4 border-b border-gray-100 dark:border-gray-800 text-center">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gray-950 text-white dark:bg-white dark:text-gray-950 mb-3 font-bold shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {tab === 'login' ? 'Welcome to Bangla AI' : 'Get Started with Bangla AI'}
          </h2>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
            {tab === 'login' 
              ? 'Access Gemini 2.5, GPT-4o, Claude 3.5, and DeepSeek in one unified platform'
              : 'Join Bangladesh’s premier multi-model AI infrastructure platform in seconds'}
          </p>

          {/* Switcher Tab */}
          <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mt-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`py-1.5 rounded-md transition-all ${
                tab === 'login'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`py-1.5 rounded-md transition-all ${
                tab === 'register'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-medium text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all flex items-center justify-center gap-3 shadow-xs active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
              ) : (
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
              )}
              <span className="font-semibold">
                {tab === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
              </span>
            </button>
          </div>

          {/* Trust and Policy Note */}
          <div className="pt-2 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Firebase Verified • Instant 1-Click Access</span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal">
              By continuing, you agree to Bangla AI’s Terms of Service and Privacy Policy. No password required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
