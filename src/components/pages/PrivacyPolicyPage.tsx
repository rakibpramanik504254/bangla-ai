import React from 'react';
import { Shield, AlertTriangle, Lock, Eye, Database, Scale, Mail } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-12 text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block">
          Legal & Compliance
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 dark:text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-gray-400 font-mono">Effective: November 2026 • Dhaka, Bangladesh</p>
      </div>

      {/* Prominent Legal Review Notice Callout */}
      <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-5 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-xs uppercase tracking-wide">Important Legal Notice:</p>
          <p className="leading-relaxed text-amber-800 dark:text-amber-300">
            This document represents a comprehensive initial draft privacy policy reflecting Bangla AI's data collection workflows, AI model transit architecture, and local regulatory considerations in Bangladesh. Prior to full-scale commercial deployment, this policy should be formally reviewed and finalized by a qualified legal professional or cyber law practitioner.
          </p>
        </div>
      </div>

      {/* Policy Sections */}
      <div className="space-y-8 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800/80">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono">
            1. Overview & Scope
          </h2>
          <p>
            Bangla AI ("we," "our," or "the Platform") respects the privacy and confidentiality of your personal information. This Privacy Policy details the categories of data we gather, how that information is utilized, our safeguards for transit across third-party model inference endpoints, and your statutory rights under relevant data protection standards.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono">
            2. Information We Collect
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Account Profile Data:</strong> Full name, verified email address, phone number, and cryptographically salted password hashes (processed via scrypt).</li>
            <li><strong>Subscription & Transaction Metadata:</strong> Selected plan, billing records, MFS Transaction IDs (TrxID via bKash/Nagad/Rocket), payment gateway timestamps, and active status. We never collect or store confidential MFS PINs or card CVVs.</li>
            <li><strong>Interaction & Session Data:</strong> Prompts submitted to AI models, generated responses, model identifiers, token consumption metrics, and user-initiated chat titles.</li>
            <li><strong>Technical Telemetry:</strong> Anonymized server logs, browser user-agent headers, and authentication tokens for session verification.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono">
            3. AI Model Processing & Third-Party Providers
          </h2>
          <p>
            When you interact with models (Google Gemini, OpenAI GPT-4o, Anthropic Claude, DeepSeek R1), your prompt payload is transmitted over secure TLS 1.3 channels to provider inference clusters strictly for the purpose of generating real-time completions. In accordance with enterprise provider terms, individual conversational data transmitted through our API pipelines is not utilized to train public foundation models.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono">
            4. Security Architecture & Storage
          </h2>
          <p>
            User credentials and database entities are protected using role-based access control (RBAC), environment-level secret isolation, and secure HMAC token verification. All sensitive external API keys are maintained exclusively on server-side clusters and are never exposed to browser runtimes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono">
            5. User Rights & Data Governance
          </h2>
          <p>
            You retain complete control over your conversational history:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access:</strong> Review your account usage, token quotas, and conversation history at any time.</li>
            <li><strong>Deletion:</strong> Delete individual conversation threads permanently from your interface with immediate database cascade.</li>
            <li><strong>Account Termination:</strong> Request complete account erasure by contacting our support team.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono">
            6. Regulatory Compliance
          </h2>
          <p>
            Bangla AI operates under the laws of the People's Republic of Bangladesh, including applicable provisions of the Cyber Security Act. Use of this platform to generate malicious, defamatory, or unlawful material is strictly prohibited.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono">
            7. Privacy Inquiries
          </h2>
          <p>
            For questions or requests concerning data protection, please contact:
          </p>
          <p className="font-mono text-xs text-gray-900 dark:text-white font-medium">
            privacy@bangla.ai / support@bangla.ai
          </p>
        </section>
      </div>
    </div>
  );
};
