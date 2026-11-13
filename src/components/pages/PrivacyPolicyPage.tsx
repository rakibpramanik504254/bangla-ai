import React from 'react';
import { Shield, AlertTriangle, Lock, Eye, Database, Scale, Mail } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 space-y-12 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 block">
          Legal & Compliance
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-black dark:text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-gray-500 font-mono">Effective: November 2026 • Dhaka, Bangladesh</p>
      </div>

      {/* Legal Notice */}
      <div className="bg-[#FAFAFA] dark:bg-[#262626] border border-black/[0.1] dark:border-white/[0.1] rounded-[8px] p-5 text-xs flex items-start gap-3.5">
        <AlertTriangle className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-xs uppercase tracking-wide text-black dark:text-white">Legal Notice:</p>
          <p className="leading-relaxed text-gray-600 dark:text-gray-400">
            This document represents a comprehensive privacy policy reflecting Bangla AI's data collection workflows, AI model transit architecture, and local regulatory considerations in Bangladesh. Prior to full-scale commercial deployment, this policy should be formally reviewed by a qualified cyber law practitioner.
          </p>
        </div>
      </div>

      {/* Policy Sections */}
      <div className="space-y-8 bg-white dark:bg-[#262626] p-6 sm:p-8 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] shadow-xs">
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            1. Overview & Scope
          </h2>
          <p>
            Bangla AI ("we," "our," or "the Platform") respects the privacy and confidentiality of your personal information. This Privacy Policy details the categories of data we gather, how that information is utilized, our safeguards for transit across third-party model inference endpoints, and your statutory rights under relevant data protection standards.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            2. Information We Collect
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-gray-600 dark:text-gray-400">
            <li><strong className="text-black dark:text-white">Account Profile Data:</strong> Full name, verified email address, phone number, and cryptographically salted password hashes (processed via scrypt).</li>
            <li><strong className="text-black dark:text-white">Subscription & Transaction Metadata:</strong> Selected plan, billing records, MFS Transaction IDs (TrxID via bKash/Nagad/Rocket), payment gateway timestamps, and active status. We never collect or store confidential MFS PINs or card CVVs.</li>
            <li><strong className="text-black dark:text-white">Interaction & Session Data:</strong> Prompts submitted to AI models, generated responses, model identifiers, token consumption metrics, and user-initiated chat titles.</li>
            <li><strong className="text-black dark:text-white">Technical Telemetry:</strong> Anonymized server logs, browser user-agent headers, and authentication tokens for session verification.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            3. AI Model Processing & Third-Party Providers
          </h2>
          <p>
            When you interact with models (Claude 3.7 Sonnet, Claude Fable 5.2, GPT-6 Astra, Gemini 4 Carbon, Grok 4.7, DeepSeek V4.1, etc.), your prompt payload is transmitted over secure TLS 1.3 channels to provider inference clusters strictly for the purpose of generating real-time completions. In accordance with enterprise provider terms, individual conversational data transmitted through our API pipelines is not utilized to train public foundation models.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            4. Security Architecture & Storage
          </h2>
          <p>
            User credentials and database entities are protected using role-based access control (RBAC), environment-level secret isolation, and secure HMAC token verification. All sensitive external API keys are maintained exclusively on server-side clusters and are never exposed to browser runtimes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            5. User Rights & Data Governance
          </h2>
          <p>
            You retain complete control over your conversational history:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
            <li><strong className="text-black dark:text-white">Access:</strong> Review your account usage, token quotas, and conversation history at any time.</li>
            <li><strong className="text-black dark:text-white">Deletion:</strong> Delete individual conversation threads permanently from your interface with immediate database cascade.</li>
            <li><strong className="text-black dark:text-white">Account Termination:</strong> Request complete account erasure by contacting our support team.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            6. Regulatory Compliance
          </h2>
          <p>
            Bangla AI operates under the laws of the People's Republic of Bangladesh, including applicable provisions of the Cyber Security Act. Use of this platform to generate malicious, defamatory, or unlawful material is strictly prohibited.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-black/[0.08] dark:border-white/[0.08]">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            7. Privacy Inquiries & Data Rights
          </h2>
          <p>
            For questions or requests concerning data protection, account deletion, or statutory rights, please contact:
          </p>
          <div className="font-mono text-xs text-black dark:text-white space-y-1">
            <p>Email: <a href="mailto:ourbangla.ai@gmail.com" className="underline">ourbangla.ai@gmail.com</a></p>
            <p>Hotline: <a href="tel:+8801622860128" className="underline">+880 1622-860128</a></p>
            <p>Website: <a href="https://bangla-ai.pro" target="_blank" rel="noopener noreferrer" className="underline">bangla-ai.pro</a></p>
          </div>
        </section>
      </div>
    </div>
  );
};
