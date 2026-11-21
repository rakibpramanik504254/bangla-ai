import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
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
import { OfferLandingPage } from './components/pages/OfferLandingPage.tsx';
import { CheckoutPage } from './components/pages/CheckoutPage.tsx';
import { ChatInterface } from './components/chat/ChatInterface.tsx';
import { AdminPanel } from './components/admin/AdminPanel.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { PaymentModal } from './components/billing/PaymentModal.tsx';
import { AccountBillingModal } from './components/account/AccountBillingModal.tsx';
import { WhatsAppSupportWidget } from './components/common/WhatsAppSupportWidget.tsx';
import { AppInstallProvider } from './context/AppInstallContext.tsx';
import { InstallGuideModal } from './components/common/InstallGuideModal.tsx';
import { TutorialModal } from './components/common/TutorialModal.tsx';
import {
  captureMetaAttributionOnLoad,
  initMetaPixel,
  trackMetaPageView,
} from './utils/metaPixel.ts';
import {
  AppView,
  CheckoutPlanId,
  buildCheckoutUrl,
  getPathnameForView,
  getPostLoginDestination,
  resolveCheckoutPlanFromSearch,
  resolveViewFromPathname,
} from './utils/navigation.ts';
import { resetScrollPosition } from './utils/scroll.ts';
import { useDynamicSeoHead } from './hooks/useDynamicSeoHead.ts';
import {
  initGa4Analytics,
  syncGscMetaTagInDocument,
  trackGa4PageView,
} from './utils/technicalSeo.ts';

function MainApp() {
  const [currentView, setCurrentView] = useState<AppView>(() =>
    resolveViewFromPathname(typeof window !== 'undefined' ? window.location.pathname : '/')
  );
  const [currentPathname, setCurrentPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlanId>(() =>
    resolveCheckoutPlanFromSearch(typeof window !== 'undefined' ? window.location.search : '')
  );
  const previousViewRef = useRef<AppView>('home');
  const currentViewRef = useRef<AppView>(currentView);
  currentViewRef.current = currentView;

  const navigateToView = useCallback((view: AppView) => {
    if (view !== 'checkout' && currentViewRef.current !== 'checkout') {
      previousViewRef.current = currentViewRef.current;
    }
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      const targetPath = getPathnameForView(view);
      if (window.location.pathname !== targetPath || window.location.search) {
        window.history.pushState({ view }, '', targetPath);
      }
      setCurrentPathname(window.location.pathname);
    }
    resetScrollPosition();
  }, []);

  const navigateToCheckout = useCallback((plan: CheckoutPlanId = 'monthly') => {
    const safePlan: CheckoutPlanId = plan === 'yearly' ? 'yearly' : 'monthly';
    if (currentViewRef.current !== 'checkout') {
      previousViewRef.current = currentViewRef.current;
    }
    setCheckoutPlan(safePlan);
    setCurrentView('checkout');
    if (typeof window !== 'undefined') {
      const targetUrl = buildCheckoutUrl(safePlan);
      if (`${window.location.pathname}${window.location.search}` !== targetUrl) {
        window.history.pushState(
          { view: 'checkout', plan: safePlan, returnView: previousViewRef.current },
          '',
          targetUrl
        );
      }
      setCurrentPathname('/checkout');
    }
    resetScrollPosition();
  }, []);

  const handleCheckoutBack = useCallback(() => {
    const fallbackView =
      previousViewRef.current && previousViewRef.current !== 'checkout'
        ? previousViewRef.current
        : 'home';
    if (typeof window !== 'undefined' && window.history.state?.returnView) {
      window.history.back();
      return;
    }
    navigateToView(fallbackView);
  }, [navigateToView]);

  useEffect(() => {
    const handlePopState = () => {
      const nextView = resolveViewFromPathname(window.location.pathname);
      setCurrentView(nextView);
      setCurrentPathname(window.location.pathname);
      if (nextView === 'checkout') {
        setCheckoutPlan(resolveCheckoutPlanFromSearch(window.location.search));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen to global checkout navigation triggers dispatched via AuthContext.openCheckout
  useEffect(() => {
    const handleCheckoutEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ plan?: CheckoutPlanId }>;
      navigateToCheckout(customEvent.detail?.plan === 'yearly' ? 'yearly' : 'monthly');
    };
    window.addEventListener('bangla-ai:navigate-checkout', handleCheckoutEvent);
    return () => window.removeEventListener('bangla-ai:navigate-checkout', handleCheckoutEvent);
  }, [navigateToCheckout]);

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

  // Capture Facebook click/browser attribution (fbclid, _fbc, _fbp) immediately on landing
  useEffect(() => {
    captureMetaAttributionOnLoad();
  }, []);

  // Initialize Meta Pixel, GSC verification meta tag, and Google Analytics 4 from backend public settings
  useEffect(() => {
    fetch('/api/settings/public')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.facebook_pixel_enabled && data.facebook_pixel_id) {
          initMetaPixel(data.facebook_pixel_id);
        }
        if (typeof document !== 'undefined') {
          syncGscMetaTagInDocument(document, data.gsc_verification_code || '');
        }
        if (data.ga4_enabled && data.ga4_measurement_id) {
          initGa4Analytics(data.ga4_measurement_id);
        }
      })
      .catch((err) => console.warn('Could not load public tracking settings:', err));
  }, []);

  // Dynamically inject route-specific Meta, OG, Twitter, Canonical & FAQ Schema into <head>
  useDynamicSeoHead(currentView, currentPathname);

  // Track page views on view/route switch
  useEffect(() => {
    trackMetaPageView();
    trackGa4PageView(currentPathname, typeof document !== 'undefined' ? document.title : undefined);
  }, [currentView, currentPathname]);

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
  const isOfferView = currentView === 'offer';
  const isCheckoutView = currentView === 'checkout';
  const hideStandardChrome = isChatView || isOfferView || isCheckoutView;

  return (
    <div
      className={`${
        isChatView ? 'h-[100dvh] overflow-hidden' : 'min-h-screen overflow-x-clip'
      } w-full max-w-full flex flex-col bg-white dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] transition-colors`}
    >
      {!hideStandardChrome && <Navbar currentView={currentView} setCurrentView={navigateToView} />}

      <div className={`flex-1 min-w-0 ${isChatView ? 'min-h-0 flex flex-col overflow-hidden' : ''}`}>
        {currentView === 'home' && <HomePage onStartChat={() => navigateToView('chat')} />}
        {currentView === 'offer' && <OfferLandingPage onStartChat={() => navigateToView('chat')} />}
        {currentView === 'checkout' && (
          <CheckoutPage
            initialPlan={checkoutPlan}
            onBack={handleCheckoutBack}
            onSuccessRedirectToChat={() => navigateToView('chat')}
            onNavigateHome={() => navigateToView('home')}
          />
        )}
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

      {!hideStandardChrome && <Footer setCurrentView={navigateToView} />}

      {/* Floating WhatsApp Live Chat (Non-subscribers only) */}
      <WhatsAppSupportWidget liftForMobileBar={isOfferView} compactOnMobile={isCheckoutView} />

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onAuthSuccess={(authenticatedUser) => {
          const alreadyHasAccess = Boolean(
            authenticatedUser.role === 'admin' || authenticatedUser.isSubscribed
          );
          if (currentViewRef.current === 'checkout' && !alreadyHasAccess) {
            window.scrollTo({ top: 0 });
            return;
          }
          navigateToView(getPostLoginDestination(authenticatedUser));
          window.scrollTo({ top: 0 });
        }}
      />
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={closePaymentModal}
        defaultPlan={paymentPlan}
        onSuccessRedirectToChat={() => navigateToView('chat')}
      />
      <AccountBillingModal
        isOpen={isAccountModalOpen}
        onClose={closeAccountModal}
        onNavigateChat={() => navigateToView('chat')}
        onNavigateHome={() => navigateToView('home')}
        onNavigateAdmin={() => navigateToView('admin')}
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
