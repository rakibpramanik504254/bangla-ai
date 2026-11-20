import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Mail,
  Clock,
  Phone,
  Globe,
  Check,
  Copy,
  ShieldCheck,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo.tsx';
import { AppView } from '../../utils/navigation.ts';

interface ContactPageProps {
  onBackHome?: () => void;
  onNavigateView?: (view: AppView) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({
  onBackHome,
  onNavigateView,
}) => {
  const [copiedField, setCopiedField] = useState<'email' | 'phone' | null>(null);

  const handleCopy = async (text: string, field: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-10 text-xs sm:text-sm text-[#444746] dark:text-[#9aa0a6] leading-[1.7] break-words">
      {/* Top Navigation Bar */}
      {onBackHome && (
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackHome}
            className="btn-pill-secondary !min-h-0 !h-9 !py-0 !px-3.5 !text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Back to Home</span>
          </button>
          <span className="text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6]">
            /contact
          </span>
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] block">
          Official Business &amp; Customer Support
        </span>
        <h1 className="text-3xl sm:text-4xl font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] tracking-tight">
          Contact Us &amp; Business Information
        </h1>
        <p className="text-xs sm:text-sm text-[#444746] dark:text-[#9aa0a6]">
          Need assistance with bKash/Nagad/Rocket verification, account access, or refund requests? Reach our Bangladesh support team directly.
        </p>
      </div>

      {/* Primary Business Verification Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="w-10 h-10 shrink-0" />
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
                Registered Brand
              </p>
              <h2 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                Bangla AI
              </h2>
            </div>
          </div>

          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">Headquarters</p>
                <p>Banani Commercial Area, Dhaka-1213, Bangladesh</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Globe className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">Website</p>
                <a
                  href="https://bangla-ai.pro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono underline text-[#1f1f1f] dark:text-[#e3e3e3]"
                >
                  bangla-ai.pro
                </a>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Support Hours &amp; Response Time
                </p>
                <p>10:00 AM – 10:00 PM BST (7 Days a Week)</p>
                <p className="text-[#444746] dark:text-[#9aa0a6]">
                  Average response time: <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">2–6 hours</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Direct Support Channels */}
        <div className="bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
                Direct Channels
              </p>
              <h2 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                Support &amp; Billing Desk
              </h2>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">Email</p>
                <a
                  href="mailto:ourbangla.ai@gmail.com"
                  className="font-mono font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] hover:underline break-all"
                >
                  ourbangla.ai@gmail.com
                </a>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('ourbangla.ai@gmail.com', 'email')}
                aria-label="Copy support email"
                className="w-8 h-8 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0 hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] transition-colors cursor-pointer"
              >
                {copiedField === 'email' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">Phone &amp; WhatsApp</p>
                <a
                  href="tel:+8801878242764"
                  className="font-mono font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] hover:underline"
                >
                  +880 1878-242764
                </a>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('+8801878242764', 'phone')}
                aria-label="Copy support phone number"
                className="w-8 h-8 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] flex items-center justify-center text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0 hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] transition-colors cursor-pointer"
              >
                {copiedField === 'phone' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="mailto:ourbangla.ai@gmail.com?subject=Support%20Inquiry%20-%20Bangla-AI.pro"
                className="btn-pill-primary !min-h-0 !h-9 !py-0 !px-4 !text-xs"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>Send Support Email</span>
              </a>
              <a
                href="tel:+8801878242764"
                className="btn-pill-secondary !min-h-0 !h-9 !py-0 !px-4 !text-xs"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>Call Support</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bilingual Quick Help Guide */}
      <div className="bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-3 text-xs">
        <h3 className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
          What to Include When Contacting Support / যোগাযোগের সময় যা উল্লেখ করবেন:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ul className="list-disc pl-5 space-y-1">
            <li>Your registered email address on Bangla-AI.pro</li>
            <li>For payment/billing help: MFS gateway (bKash/Nagad/Rocket), sender number, and TrxID</li>
            <li>For technical issues: Model name or screenshot of the error</li>
          </ul>
          <ul className="list-disc pl-5 space-y-1">
            <li>Bangla-AI.pro-তে আপনার নিবন্ধিত ইমেইল ঠিকানা</li>
            <li>পেমেন্ট বা রিফান্ড সংক্রান্ত সহায়তার জন্য: বিকাশ/নগদ/রকেট নম্বর ও TrxID</li>
            <li>সকাল ১০টা থেকে রাত ১০টার মধ্যে (BST) ২–৬ ঘণ্টার ভেতর উত্তর পাবেন</li>
          </ul>
        </div>
      </div>

      {/* Related Compliance Pages */}
      {onNavigateView && (
        <div className="bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6]">
            Related Legal &amp; Compliance Policies
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/privacy-policy"
              onClick={(e) => {
                e.preventDefault();
                onNavigateView('privacy');
              }}
              className="btn-pill-secondary !min-h-0 !h-9 !py-0 !px-4 !text-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Privacy Policy</span>
            </a>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                onNavigateView('terms');
              }}
              className="btn-pill-secondary !min-h-0 !h-9 !py-0 !px-4 !text-xs"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Terms &amp; Conditions</span>
            </a>
            <a
              href="/refund-policy"
              onClick={(e) => {
                e.preventDefault();
                onNavigateView('refund');
              }}
              className="btn-pill-secondary !min-h-0 !h-9 !py-0 !px-4 !text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>Refund Policy</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
