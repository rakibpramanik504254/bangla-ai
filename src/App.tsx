import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { HomePage } from './components/pages/HomePage.tsx';
import { AboutPage } from './components/pages/AboutPage.tsx';
import { PrivacyPolicyPage } from './components/pages/PrivacyPolicyPage.tsx';
import { TermsPage } from './components/pages/TermsPage.tsx';
import { RefundPolicyPage } from './components/pages/RefundPolicyPage.tsx';
import { ContactPage } from './components/pages/ContactPage.tsx';
import { SecurityPage } from './components/pages/SecurityPage.tsx';
import { AccountPage } from './components/pages/AccountPage.tsx';
import { ChatInterface } from './components/chat/ChatInterface.tsx';
import { AdminPanel } from './components/admin/AdminPanel.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { PaymentModal } from './components/billing/PaymentModal.tsx';
import { AccountBillingModal } from './components/account/AccountBillingModal.tsx';
import { WhatsAppSupportWidget } from './components/common/WhatsAppSupportWidget.tsx';
import { AppInstallProvider } from './context/AppInstallContext.tsx';
import { InstallGuideModal } from './components/common/InstallGuideModal.tsx';
import { TutorialModal } from './components/common/TutorialModal.tsx';
import { initMetaPixel, trackMetaPageView } from './utils/metaPixel.ts';
import {
  AppView,
  getPathnameForView,
  getPostLoginDestination,
  resolveViewFromPathname,
} from './utils/navigation.ts';
import { resetScrollPosition } from './utils/scroll.ts';

function MainApp() {
  const [currentView, setCurrentView] = useState<AppView>(() =>
    resolveViewFromPathname(typeof window !== 'undefined' ? window.location.pathname : '/')
  );
  const [currentPathname, setCurrentPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  const navigateToView = useCallback((view: AppView) => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      const targetPath = getPathnameForView(view);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view }, '', targetPath);
      }
      setCurrentPathname(window.location.pathname);
    }
    resetScrollPosition();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(resolveViewFromPathname(window.location.pathname));
      setCurrentPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global ScrollToTop on any URL path or view state change
  useLayoutEffect(() => {
    resetScrollPosition();
    const rafId = window.requestAnimationFrame(() => resetScrollPosition());
    return () => window.cancelAnimationFrame(rafId);
  }, [currentView, currentPathname]);
  const {
    user,
    loading,
    isAuthModalOpen,
    closeAuthModal,
    isPaymentModalOpen,
    paymentPlan,
    closePaymentModal,
    isAccountModalOpen,
    openAccountModal,
    closeAccountModal,
  } = useAuth();

  // Initialize Meta Pixel from backend public settings
  useEffect(() => {
    fetch('/api/settings/public')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.facebook_pixel_enabled && data?.facebook_pixel_id) {
          initMetaPixel(data.facebook_pixel_id);
        }
      })
      .catch((err) => console.warn('Could not load public pixel settings:', err));
  }, []);

  // Track page views on view switch
  useEffect(() => {
    trackMetaPageView();
  }, [currentView]);

  // Guard protected views when logged out or non-admin
  useEffect(() => {
    if (loading) return;
    if (!user && (currentView === 'chat' || currentView === 'account' || currentView === 'admin')) {
      closeAccountModal();
      navigateToView('home');
    } else if (user && user.role !== 'admin' && currentView === 'admin') {
      navigateToView('home');
    }
  }, [loading, user, currentView, closeAccountModal, navigateToView]);

  const isChatView = currentView === 'chat';

  return (
    <div
      className={`${
        isChatView ? 'h-[100dvh] overflow-hidden' : 'min-h-screen overflow-x-clip'
      } w-full max-w-full flex flex-col bg-white dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] transition-colors`}
    >
      {!isChatView && <Navbar currentView={currentView} setCurrentView={navigateToView} />}

      <div className={`flex-1 min-w-0 ${isChatView ? 'min-h-0 flex flex-col overflow-hidden' : ''}`}>
        {currentView === 'home' && <HomePage onStartChat={() => navigateToView('chat')} />}
        {currentView === 'about' && <AboutPage />}
        {currentView === 'privacy' && <PrivacyPolicyPage />}
        {currentView === 'terms' && <TermsPage />}
        {currentView === 'refund' && (
          <RefundPolicyPage
            onBackHome={() => navigateToView('home')}
            onNavigateContact={() => navigateToView('contact')}
          />
        )}
        {currentView === 'contact' && (
          <ContactPage
            onBackHome={() => navigateToView('home')}
            onNavigateView={navigateToView}
          />
        )}
        {currentView === 'security' && <SecurityPage />}
        {currentView === 'account' && <AccountPage />}
        {currentView === 'chat' && (
          <ChatInterface
            onNavigateHome={() => navigateToView('home')}
            onNavigateAccount={() => openAccountModal()}
            onNavigateAdmin={() => navigateToView('admin')}
          />
        )}
        {currentView === 'admin' && <AdminPanel />}
      </div>

      {!isChatView && <Footer setCurrentView={navigateToView} />}

      {/* Floating WhatsApp Live Chat (Non-subscribers only) */}
      <WhatsAppSupportWidget />

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onAuthSuccess={(authenticatedUser) => {
          navigateToView(getPostLoginDestination(authenticatedUser));
          window.scrollTo({ top: 0 });
        }}
      />
      <AccountBillingModal
        isOpen={isAccountModalOpen}
        onClose={closeAccountModal}
        onNavigateChat={() => navigateToView('chat')}
        onNavigateHome={() => navigateToView('home')}
        onNavigateAdmin={() => navigateToView('admin')}
      />
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={closePaymentModal}
        defaultPlan={paymentPlan}
        onSuccessRedirectToChat={() => navigateToView('chat')}
      />
      <InstallGuideModal />
      <TutorialModal />
    </div>
  );
}

export default function App() {
  return (
    <AppInstallProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </AppInstallProvider>
  );
}
