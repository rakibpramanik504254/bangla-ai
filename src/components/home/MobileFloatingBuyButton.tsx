import React from 'react';
import { ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const MobileFloatingBuyButton: React.FC = () => {
  const { user, token, loading, hasActiveSubscription, openPaymentModal } = useAuth();

  // Avoid flashing CTA while restoring an authenticated session
  if (loading && Boolean(token) && !user) {
    return null;
  }

  // Strictly visible to non-subscribers only
  if (hasActiveSubscription) {
    return null;
  }

  return (
    <div
      data-testid="mobile-floating-buy-cta"
      className="fixed bottom-4 left-4 right-4 z-40 md:hidden pointer-events-none"
    >
      <button
        type="button"
        onClick={() => openPaymentModal('monthly')}
        data-testid="mobile-floating-buy-btn"
        aria-label="Buy Now — মাত্র ৬৯৯৳ Express Checkout"
        className="pointer-events-auto w-full h-12 px-5 rounded-full bg-white text-slate-950 font-bold text-sm tracking-tight flex items-center justify-center gap-2 border border-cyan-300/60 shadow-[0_0_25px_rgba(34,211,238,0.65)] hover:shadow-[0_0_32px_rgba(34,211,238,0.85)] active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      >
        <Zap className="w-4 h-4 text-cyan-600 fill-cyan-500 shrink-0" aria-hidden="true" />
        <span>Buy Now — মাত্র ৬৯৯৳</span>
        <ArrowRight className="w-4 h-4 text-slate-950 shrink-0" aria-hidden="true" />
      </button>
    </div>
  );
};
