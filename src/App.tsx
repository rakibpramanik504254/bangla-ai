import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { HomePage } from './components/pages/HomePage.tsx';
import { AboutPage } from './components/pages/AboutPage.tsx';
import { PrivacyPolicyPage } from './components/pages/PrivacyPolicyPage.tsx';
import { TermsPage } from './components/pages/TermsPage.tsx';
import { SecurityPage } from './components/pages/SecurityPage.tsx';
import { AccountPage } from './components/pages/AccountPage.tsx';
import { ChatInterface } from './components/chat/ChatInterface.tsx';
import { AdminPanel } from './components/admin/AdminPanel.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { PaymentModal } from './components/billing/PaymentModal.tsx';
import { AccountBillingModal } from './components/account/AccountBillingModal.tsx';
import { WhatsAppSupportWidget } from './components/common/WhatsAppSupportWidget.tsx';
import { initMetaPixel, trackMetaPageView } from './utils/metaPixel.ts';
import { AppView, getPostLoginDestination } from './utils/navigation.ts';

function MainApp() {
  const [currentView, setCurrentView] = useState<AppView>('home');
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
      setCurrentView('home');
    } else if (user && user.role !== 'admin' && currentView === 'admin') {
      setCurrentView('home');
    }
  }, [loading, user, currentView, closeAccountModal]);

  const isChatView = currentView === 'chat';

  return (
    <div
      className={`${
        isChatView ? 'h-[100dvh] overflow-hidden' : 'min-h-screen overflow-x-clip'
      } w-full max-w-full flex flex-col bg-white dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] transition-colors`}
    >
      {!isChatView && <Navbar currentView={currentView} setCurrentView={setCurrentView} />}

      <div className={`flex-1 min-w-0 ${isChatView ? 'min-h-0 flex flex-col overflow-hidden' : ''}`}>
        {currentView === 'home' && <HomePage onStartChat={() => setCurrentView('chat')} />}
        {currentView === 'about' && <AboutPage />}
        {currentView === 'privacy' && <PrivacyPolicyPage />}
        {currentView === 'terms' && <TermsPage />}
        {currentView === 'security' && <SecurityPage />}
        {currentView === 'account' && <AccountPage />}
        {currentView === 'chat' && (
          <ChatInterface
            onNavigateHome={() => setCurrentView('home')}
            onNavigateAccount={() => openAccountModal()}
            onNavigateAdmin={() => setCurrentView('admin')}
          />
        )}
        {currentView === 'admin' && <AdminPanel />}
      </div>

      {!isChatView && <Footer setCurrentView={setCurrentView} />}

      {/* Floating WhatsApp Live Chat (Non-subscribers only) */}
      <WhatsAppSupportWidget />

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onAuthSuccess={(authenticatedUser) => {
          setCurrentView(getPostLoginDestination(authenticatedUser));
          window.scrollTo({ top: 0 });
        }}
      />
      <AccountBillingModal
        isOpen={isAccountModalOpen}
        onClose={closeAccountModal}
        onNavigateChat={() => setCurrentView('chat')}
        onNavigateHome={() => setCurrentView('home')}
        onNavigateAdmin={() => setCurrentView('admin')}
      />
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={closePaymentModal}
        defaultPlan={paymentPlan}
        onSuccessRedirectToChat={() => setCurrentView('chat')}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
