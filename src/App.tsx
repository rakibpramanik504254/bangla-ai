import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { HomePage } from './components/pages/HomePage.tsx';
import { AboutPage } from './components/pages/AboutPage.tsx';
import { PrivacyPolicyPage } from './components/pages/PrivacyPolicyPage.tsx';
import { AccountPage } from './components/pages/AccountPage.tsx';
import { ChatInterface } from './components/chat/ChatInterface.tsx';
import { AdminPanel } from './components/admin/AdminPanel.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { PaymentModal } from './components/billing/PaymentModal.tsx';

function MainApp() {
  const [currentView, setCurrentView] = useState<'home' | 'chat' | 'account' | 'admin' | 'about' | 'privacy'>('home');
  const {
    isAuthModalOpen,
    closeAuthModal,
    isPaymentModalOpen,
    paymentPlan,
    closePaymentModal
  } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      <div className="flex-1">
        {currentView === 'home' && <HomePage onStartChat={() => setCurrentView('chat')} />}
        {currentView === 'about' && <AboutPage />}
        {currentView === 'privacy' && <PrivacyPolicyPage />}
        {currentView === 'account' && <AccountPage />}
        {currentView === 'chat' && <ChatInterface />}
        {currentView === 'admin' && <AdminPanel />}
      </div>

      {currentView !== 'chat' && <Footer setCurrentView={setCurrentView} />}

      {/* Global Modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
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
