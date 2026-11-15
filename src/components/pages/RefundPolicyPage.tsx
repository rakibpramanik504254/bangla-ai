import React from 'react';
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock, ShieldCheck, Mail } from 'lucide-react';

interface RefundPolicyPageProps {
  onBackHome?: () => void;
  onNavigateContact?: () => void;
}

export const RefundPolicyPage: React.FC<RefundPolicyPageProps> = ({
  onBackHome,
  onNavigateContact,
}) => {
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
            /refund-policy
          </span>
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#444746] dark:text-[#9aa0a6] block">
          Legal &amp; Billing Compliance
        </span>
        <h1 className="text-3xl sm:text-4xl font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] tracking-tight">
          Refund &amp; Cancellation Policy
        </h1>
        <p className="text-xs text-[#444746] dark:text-[#9aa0a6] font-mono">
          Last Updated: November 2026 • Bangla-AI.pro • Banani Commercial Area, Dhaka-1213, Bangladesh
        </p>
      </div>

      {/* Bilingual Summary Box */}
      <div className="bg-[#f0f4f9] dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-5 sm:p-6 text-xs space-y-3">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="font-semibold text-xs uppercase tracking-wide text-[#1f1f1f] dark:text-[#e3e3e3]">
              Policy Overview
            </p>
            <p className="leading-[1.7] text-[#444746] dark:text-[#9aa0a6]">
              Bangla-AI.pro provides instant digital SaaS subscriptions payable in Bangladeshi Taka (BDT) via bKash, Nagad, and Rocket. Refunds are supported for verified duplicate payments or unresolved technical lockouts prior to token consumption, processed back to your original MFS wallet within 3–5 business days.
            </p>
          </div>
        </div>
        <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
          <p className="font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
            সংক্ষিপ্ত সারসংক্ষেপ (বাংলা):
          </p>
          <p className="leading-[1.7] text-[#444746] dark:text-[#9aa0a6]">
            পেমেন্ট ভেরিফিকেশনের সাথে সাথেই ডিজিটাল সাবস্ক্রিপশন ও এআই টোকেন সক্রিয় করা হয়। ভুলবশত ডাবল পেমেন্ট হলে অথবা টোকেন ব্যবহারের আগে ২৪–৪৮ ঘণ্টার মধ্যে কোনো টেকনিক্যাল সমস্যার কারণে অ্যাক্সেস না পেলে ৩–৫ কর্মদিবসের মধ্যে আপনার মূল বিকাশ, নগদ বা রকেট নম্বরে টাকা ফেরত দেওয়া হবে। তবে উল্লেখযোগ্য পরিমাণ এআই টোকেন ব্যবহার হয়ে গেলে সাবস্ক্রিপশন ফি অফেরতযোগ্য।
          </p>
        </div>
      </div>

      {/* Policy Sections */}
      <div className="space-y-8 bg-white dark:bg-[#1e1f20] p-5 sm:p-8 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
        {/* Section 1 */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] uppercase tracking-wider font-mono">
            1. Instant Digital Delivery &amp; Activation
          </h2>
          <p>
            Bangla-AI.pro delivers 100% digital cloud AI software services with no physical shipping. When you pay for our Monthly Plan (৳699/month) or Yearly Plan (৳5,999/year) via <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">bKash, Nagad, or Rocket</strong> and submit a valid Transaction ID (TrxID), your account token quota and AI Workspace access are activated immediately upon verification.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] uppercase tracking-wider font-mono">
            2. Eligible Scenarios for a Full Refund
          </h2>
          <p>You are eligible to request a full 100% refund under any of the following verified circumstances:</p>
          <ul className="space-y-2.5 text-[#444746] dark:text-[#9aa0a6]">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Accidental Duplicate Payment:</strong> If you mistakenly paid twice for the same billing cycle or submitted two MFS transactions for a single upgrade, the extra payment is fully refundable upon TrxID verification.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Verified Technical Failure (Within 24–48 Hours):</strong> If a confirmed platform outage or account provisioning error prevents you from accessing the AI Workspace within 24–48 hours of payment approval, and zero or negligible tokens have been consumed.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Unverified / Declined Order Overpayment:</strong> If you transferred BDT to our official MFS number but your subscription activation was declined or could not be provisioned.
              </span>
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] uppercase tracking-wider font-mono">
            3. Non-Refundable Conditions
          </h2>
          <p>
            Because Bangla-AI.pro incurs real-time upstream API and GPU inference costs whenever you chat or generate images, refunds cannot be issued in the following cases:
          </p>
          <ul className="space-y-2.5 text-[#444746] dark:text-[#9aa0a6]">
            <li className="flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Substantial Token Consumption:</strong> Once a subscription is activated and substantial AI text/image tokens (e.g., more than 5% of your plan quota or repeated generation sessions) have been consumed, the billing period fee becomes non-refundable.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Change of Mind After Usage:</strong> Dissatisfaction with probabilistic AI output phrasing after actively utilizing the workspace does not qualify for a refund once tokens are spent.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Policy Violations &amp; Fraud:</strong> Accounts suspended due to submitting fabricated TrxIDs, automated scraping, or violating our Acceptable Use Policy are ineligible for refunds.
              </span>
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] uppercase tracking-wider font-mono">
            4. Subscription Cancellation Policy
          </h2>
          <p>
            Manual bKash, Nagad, and Rocket payments on Bangla-AI.pro are one-time cycle payments and <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">never auto-debit</strong> your MFS wallet without your explicit action. You may stop renewing or request subscription cancellation anytime by contacting support before your next billing cycle—your remaining paid access continues smoothly until the end of your current active period.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] uppercase tracking-wider font-mono">
            5. How to Request a Refund &amp; Processing Timeline
          </h2>
          <div className="rounded-xl bg-[#f0f4f9] dark:bg-[#131314] border border-black/[0.06] dark:border-white/[0.08] p-4 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Refund Settlement Timeline: 3–5 Business Days</span>
            </div>
            <p>
              To submit a refund request, email <a href="mailto:ourbangla.ai@gmail.com" className="font-mono underline text-[#1f1f1f] dark:text-[#e3e3e3]">ourbangla.ai@gmail.com</a> within <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">48 hours</strong> of the transaction with:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your registered Bangla-AI.pro account email address</li>
              <li>Payment method used (<strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">bKash, Nagad, or Rocket</strong>)</li>
              <li>Sender mobile number &amp; Transaction ID (<strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">TrxID</strong>)</li>
              <li>Brief reason for the refund request (e.g., duplicate payment or access issue)</li>
            </ul>
            <p className="pt-1">
              Once verified by our billing team, approved refunds are returned within <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">3–5 business days</strong> directly to the <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">original MFS sender number</strong> (cashback/transfer to third-party numbers is not permitted for fraud prevention).
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3 pt-4 border-t border-black/[0.08] dark:border-white/[0.08]">
          <h2 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] uppercase tracking-wider font-mono">
            6. Billing &amp; Refund Desk
          </h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="mailto:ourbangla.ai@gmail.com?subject=Refund%20Request%20-%20Bangla-AI.pro"
              className="btn-pill-primary !min-h-0 !h-9 !py-0 !px-4 !text-xs"
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span>Email ourbangla.ai@gmail.com</span>
            </a>
            {onNavigateContact && (
              <button
                type="button"
                onClick={onNavigateContact}
                className="btn-pill-secondary !min-h-0 !h-9 !py-0 !px-4 !text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>View Contact &amp; Business Info</span>
              </button>
            )}
          </div>
          <p className="text-[11px] font-mono text-[#444746] dark:text-[#9aa0a6]">
            bangla-ai.pro • Banani Commercial Area, Dhaka-1213, Bangladesh • Phone: +880 1622-860128 • Support Hours: 10:00 AM – 10:00 PM BST
          </p>
        </section>
      </div>
    </div>
  );
};
