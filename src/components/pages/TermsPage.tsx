import React from 'react';
import { FileText, AlertCircle, ShieldCheck, Scale, CheckCircle2, DollarSign, Ban, Cpu } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-10 sm:space-y-12 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 block">
          Legal & Compliance
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-black dark:text-white tracking-tight">
          Terms & Conditions
        </h1>
        <p className="text-xs text-gray-500 font-mono">
          Last Updated: November 2026 • Banani Commercial Area, Dhaka, Bangladesh
        </p>
      </div>

      {/* Summary Box */}
      <div className="bg-[#FAFAFA] dark:bg-[#262626] border border-black/[0.1] dark:border-white/[0.1] rounded-[8px] p-5 text-xs flex items-start gap-3.5">
        <Scale className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-xs uppercase tracking-wide text-black dark:text-white">Summary of Agreement:</p>
          <p className="leading-relaxed text-gray-600 dark:text-gray-400">
            By creating an account, accessing the workspace, or purchasing a subscription on Bangla AI, you agree to these Terms and Conditions. You retain 100% full commercial ownership of your generated content, agree to pay in Bangladeshi Taka (BDT) via verified MFS channels, and commit to responsible AI utilization.
          </p>
        </div>
      </div>

      {/* Terms Content Sections */}
      <div className="space-y-8 bg-white dark:bg-[#262626] p-6 sm:p-8 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] shadow-xs">
        {/* Section 1 */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            1. Acceptance of Terms
          </h2>
          <p>
            These Terms and Conditions ("Terms") govern your access to and use of Bangla AI ("Platform", "we", "us", or "our"), including our web application, API gateways, multi-model chat workspace, and related subscription services. If you do not accept these Terms in full, you must discontinue using the Platform immediately.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            2. Account Registration & Security
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-gray-600 dark:text-gray-400">
            <li><strong className="text-black dark:text-white">Eligibility:</strong> You must be at least 18 years old or possess legal parental/guardian consent in accordance with the laws of Bangladesh.</li>
            <li><strong className="text-black dark:text-white">Account Accuracy:</strong> You agree to provide true, accurate, and current information (name, valid email address, and mobile number) during registration.</li>
            <li><strong className="text-black dark:text-white">Credential Protection:</strong> You are responsible for safeguarding your login credentials. Any activity conducted through your authenticated session is deemed your responsibility.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            3. Subscription Plans, Billing & MFS Payments
          </h2>
          <p>
            Bangla AI offers Monthly (৳699) and Yearly (৳5,999) recurring subscription plans payable in Bangladeshi Taka (BDT) via Mobile Financial Services (bKash, Nagad, and Rocket).
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-gray-600 dark:text-gray-400">
            <li><strong className="text-black dark:text-white">Transaction Verification:</strong> To activate a plan, you must send the exact specified amount to our designated official MFS account and submit the 8–10 alphanumeric Transaction ID (TrxID) along with your sender mobile number.</li>
            <li><strong className="text-black dark:text-white">Admin Validation:</strong> Subscriptions are verified against MFS merchant ledgers. Submitting fabricated, duplicate, or third-party unauthorized TrxIDs constitutes fraud and results in immediate account termination.</li>
            <li><strong className="text-black dark:text-white">Token Quotas & Renewal:</strong> Monthly plans allocate 1,000,000 (1M) monthly tokens; Yearly plans allocate 15,000,000 (15M) annual tokens. Quotas reset upon successful renewal.</li>
            <li><strong className="text-black dark:text-white">Refund Policy:</strong> Because token capacity and GPU inference resources are provisioned in real time upon activation, subscription fees are non-refundable once approved and used. If you submit a duplicate payment in error, contact ourbangla.ai@gmail.com within 48 hours for adjustment.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            4. Intellectual Property & Content Ownership
          </h2>
          <div className="space-y-2 text-gray-600 dark:text-gray-400">
            <p>
              <strong className="text-black dark:text-white">Your Content:</strong> You retain complete ownership of all prompts, text, code, and documents you input into the Platform.
            </p>
            <p>
              <strong className="text-black dark:text-white">Generated Output:</strong> Subject to your compliance with these Terms, Bangla AI assigns to you all rights, title, and interest in and to the completions, code solutions, translations, and artifacts generated for your queries. You are granted full rights to reproduce, commercialize, publish, and distribute generated outputs without royalties or attribution.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            5. Acceptable Use Policy
          </h2>
          <p>You agree not to use Bangla AI to generate, facilitate, or distribute:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-gray-600 dark:text-gray-400">
            <li>Content that promotes illegal activities under the Digital Security Act / Cyber Security Act of Bangladesh or international law.</li>
            <li>Malicious code, spyware, denial-of-service tools, or ransomware exploits.</li>
            <li>Defamatory, fraudulent, harassing, or sexually explicit material.</li>
            <li>Automated scraping or reverse engineering of the Platform's proprietary API routing structures or model endpoints.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            6. Foundation Models & Service Availability
          </h2>
          <p>
            Bangla AI interfaces with premier AI providers including Anthropic (Claude), OpenAI (GPT-6), Google (Gemini 4), xAI (Grok), DeepSeek, and Moonshot (Kimi). While we strive for 99.9% continuous service uptime:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-gray-600 dark:text-gray-400">
            <li>Third-party model providers may occasionally perform scheduled maintenance, rate limits, or updates outside our direct control.</li>
            <li>AI outputs are probabilistic. You should exercise independent technical and legal judgment before relying on mission-critical calculations, medical queries, or legal advice.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            7. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by applicable law in Bangladesh, Bangla AI and its operators shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from lost profits, service interruptions, or reliance on generated content. Our maximum cumulative liability is limited to the subscription amount paid by you in the preceding three (3) months.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            8. Governing Law & Dispute Resolution
          </h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the People's Republic of Bangladesh. Any dispute arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts in Dhaka, Bangladesh.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-2.5 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            9. Contact & Support
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            For questions regarding these Terms, billing inquiries, or enterprise arrangements, reach out to our legal and operations desk:
          </p>
          <div className="pt-2 font-mono text-xs space-y-1 text-black dark:text-white break-words">
            <p>Email: <a href="mailto:ourbangla.ai@gmail.com" className="underline break-all">ourbangla.ai@gmail.com</a></p>
            <p>Hotline: <a href="tel:+8801622860128" className="underline">+880 1622-860128</a></p>
            <p>Official Website: <a href="https://bangla-ai.pro" target="_blank" rel="noopener noreferrer" className="underline">bangla-ai.pro</a></p>
            <p>Facebook: <a href="https://www.facebook.com/profile.php?id=61596472081766" target="_blank" rel="noopener noreferrer" className="underline break-all">facebook.com/profile.php?id=61596472081766</a></p>
            <p>Address: Banani Commercial Area, Dhaka-1213, Bangladesh</p>
          </div>
        </section>
      </div>
    </div>
  );
};
