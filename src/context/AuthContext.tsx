import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { signInWithGoogle, signOutFromFirebase } from '../firebase.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  loginWithGoogle: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  isPaymentModalOpen: boolean;
  paymentPlan: 'monthly' | 'yearly';
  openPaymentModal: (plan?: 'monthly' | 'yearly') => void;
  closePaymentModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bangla_ai_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('bangla_ai_theme') as 'light' | 'dark') || 'light';
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null;
    if (favicon) {
      favicon.href =
        theme === 'dark'
          ? '/assets/aistudio/for_black_theme__6e900797.png'
          : '/assets/aistudio/for_white_theme__de4bccba.png';
    }
    localStorage.setItem('bangla_ai_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('bangla_ai_token');
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser({
          ...data,
          current_usage: data.usage.used,
          usage_limit: data.usage.limit
        });
      } else {
        // Token invalid
        localStorage.removeItem('bangla_ai_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const { user: fbUser, token: idToken } = await signInWithGoogle();
      if (!fbUser.email) {
        throw new Error('Google account must have an associated email address.');
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fbUser.email,
          name: fbUser.displayName || fbUser.email.split('@')[0],
          photoURL: fbUser.photoURL,
          uid: fbUser.uid,
          idToken
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google authentication failed');
      }

      localStorage.setItem('bangla_ai_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        throw new Error('Sign-in cancelled. Please complete the Google prompt.');
      }
      if (err?.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by your browser. Please allow popups for this site and try again.');
      }
      if (err?.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        throw new Error(`Domain "${host}" is not authorized in Firebase Auth. Please add it to Firebase Console -> Authentication -> Settings -> Authorized domains.`);
      }
      throw new Error(err?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed. Please check your credentials.');
    }

    localStorage.setItem('bangla_ai_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setIsAuthModalOpen(false);
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed. Please try again.');
    }

    localStorage.setItem('bangla_ai_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    try {
      await signOutFromFirebase();
    } catch (e) {
      console.warn('Firebase signout note:', e);
    }
    localStorage.removeItem('bangla_ai_token');
    setToken(null);
    setUser(null);
  };

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const openPaymentModal = (plan: 'monthly' | 'yearly' = 'monthly') => {
    setPaymentPlan(plan);
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        theme,
        toggleTheme,
        loginWithGoogle,
        login,
        register,
        logout,
        refreshUser,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        isPaymentModalOpen,
        paymentPlan,
        openPaymentModal,
        closePaymentModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
