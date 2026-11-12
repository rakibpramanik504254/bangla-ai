import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface FooterProps {
  setCurrentView: (view: 'home' | 'chat' | 'account' | 'admin' | 'about' | 'privacy') => void;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentView }) => {
  return (
    <footer className="border-t border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] text-gray-500 text-xs transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs">
                ✦
              </div>
              <span className="text-sm font-bold tracking-tight text-black dark:text-white">Bangla AI</span>
            </div>
            <p className="text-xs leading-relaxed text-gray-500 max-w-xs">
              Unified multi-model AI infrastructure platform. Bringing world-class foundation models to Bangladesh with frictionless local billing.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-black dark:text-white" />
              <span>TLS 1.3 Encrypted • Verified Gateways</span>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-2">
            <h4 className="font-semibold text-black dark:text-white text-xs uppercase tracking-wider font-mono">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => setCurrentView('home')}
                  className="hover:text-black dark:hover:text-white transition-colors"
                >
                  Overview
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setCurrentView('home');
                    setTimeout(() => {
                      document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="hover:text-black dark:hover:text-white transition-colors"
                >
                  Subscription Plans (৳1,299)
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('chat')}
                  className="hover:text-black dark:hover:text-white transition-colors"
                >
                  AI Workspace
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('account')}
                  className="hover:text-black dark:hover:text-white transition-colors"
                >
                  Account & Billing
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-2">
            <h4 className="font-semibold text-black dark:text-white text-xs uppercase tracking-wider font-mono">
              Governance
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => setCurrentView('about')}
                  className="hover:text-black dark:hover:text-white transition-colors"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('privacy')}
                  className="hover:text-black dark:hover:text-white transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <span className="text-gray-400">Terms of Service</span>
              </li>
              <li>
                <span className="text-gray-400">Security Standards</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <h4 className="font-semibold text-black dark:text-white text-xs uppercase tracking-wider font-mono">
              Headquarters
            </h4>
            <ul className="space-y-1.5 text-xs text-gray-500">
              <li>Banani Commercial Area</li>
              <li>Dhaka-1213, Bangladesh</li>
              <li className="pt-1 font-mono text-gray-700 dark:text-gray-300">support@bangla.ai</li>
              <li className="font-mono text-gray-700 dark:text-gray-300">+880 9612-000000</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-400">
          <p>© 2026 Bangla AI. All rights reserved.</p>
          <p className="font-mono text-[10px]">
            OpenAI Minimal Design Architecture.
          </p>
        </div>
      </div>
    </footer>
  );
};
