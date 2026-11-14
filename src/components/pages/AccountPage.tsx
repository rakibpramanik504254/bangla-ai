import React from 'react';
import { AccountBillingPanel } from '../account/AccountBillingPanel.tsx';

export const AccountPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8 animate-in fade-in">
      <div className="border-b border-black/[0.08] dark:border-white/[0.08] pb-5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] block mb-1">
          Subscriber Portal
        </span>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">
          Account &amp; Billing
        </h1>
        <p className="text-xs sm:text-sm text-[#444746] dark:text-[#9aa0a6] mt-1 leading-[1.7]">
          Manage your profile, appearance preference, active subscription, and payment history in one place.
        </p>
      </div>

      <AccountBillingPanel />
    </div>
  );
};
