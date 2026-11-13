import React from 'react';
import { ShieldCheck, Lock, Server, Key, RefreshCw, EyeOff, FileText, CheckCircle2 } from 'lucide-react';

export const SecurityPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 space-y-12 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 block">
          Trust & Infrastructure
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-black dark:text-white tracking-tight">
          Security Standards & Compliance
        </h1>
        <p className="text-xs text-gray-500 font-mono">
          Last Audited: November 2026 • Enterprise Grade Infrastructure
        </p>
      </div>

      {/* Summary Box */}
      <div className="bg-[#FAFAFA] dark:bg-[#262626] border border-black/[0.1] dark:border-white/[0.1] rounded-[8px] p-5 text-xs flex items-start gap-3.5">
        <ShieldCheck className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-xs uppercase tracking-wide text-black dark:text-white">Security Philosophy:</p>
          <p className="leading-relaxed text-gray-600 dark:text-gray-400">
            Bangla AI is built on principles of confidentiality, zero-data-retention model transit, and bank-grade encryption. We protect Bangladesh's developers, agencies, and enterprises with modern cryptographic protocols.
          </p>
        </div>
      </div>

      {/* Security Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-minimal p-5 space-y-2">
          <Lock className="w-4 h-4 text-black dark:text-white" />
          <h3 className="font-bold text-black dark:text-white text-xs">TLS 1.3 Encryption</h3>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            All token streams, user queries, and server communications use modern forward-secret cipher suites.
          </p>
        </div>

        <div className="card-minimal p-5 space-y-2">
          <EyeOff className="w-4 h-4 text-black dark:text-white" />
          <h3 className="font-bold text-black dark:text-white text-xs">Zero Model Training</h3>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Your proprietary source code, legal briefs, and chat payloads are never fed into public foundation models.
          </p>
        </div>

        <div className="card-minimal p-5 space-y-2">
          <Key className="w-4 h-4 text-black dark:text-white" />
          <h3 className="font-bold text-black dark:text-white text-xs">Secure Hashing</h3>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            User credentials use cryptographic scrypt hashing with per-user unique salts. We never store plain passwords.
          </p>
        </div>
      </div>

      {/* Detailed Standards */}
      <div className="space-y-8 bg-white dark:bg-[#262626] p-6 sm:p-8 rounded-[8px] border border-black/[0.08] dark:border-white/[0.08] shadow-xs">
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            1. Data Transit & API Gateway Security
          </h2>
          <p>
            When you send a prompt, your payload is processed through our stateless backend proxy. The proxy verifies your session JWT, checks token allowances, and streams the completion directly from provider clusters (Anthropic, Google, OpenAI, xAI, DeepSeek) through encrypted connections. Prompts are not held in temporary unsecured caches.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            2. Payment Information & MFS Safety
          </h2>
          <p>
            Bangla AI does not process or retain sensitive credit card numbers or Mobile Financial Services (bKash/Nagad/Rocket) personal PINs. Verification is conducted solely through unique Transaction IDs (TrxID) matched against merchant statements, ensuring your financial accounts remain completely isolated from our servers.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            3. Authentication & Session Management
          </h2>
          <p>
            User authentication utilizes industry-standard JSON Web Tokens (JWT) signed with high-entropy HMAC-SHA256 secrets. Tokens carry an expiration threshold and must be transmitted via HTTP Authorization Bearer headers. Passwords require a minimum length and are verified using timing-attack resistant comparisons.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            4. Vulnerability Disclosure & Incident Response
          </h2>
          <p>
            We take system vulnerabilities seriously. If you discover a security flaw or vulnerability within the Bangla AI infrastructure, please notify our security team at <a href="mailto:ourbangla.ai@gmail.com" className="underline font-mono text-black dark:text-white">ourbangla.ai@gmail.com</a> or call our hotline <a href="tel:+8801622860128" className="underline font-mono text-black dark:text-white">+880 1622-860128</a>. We acknowledge verified reports within 24 hours and do not pursue legal action against responsible, good-faith researchers.
          </p>
        </section>
      </div>
    </div>
  );
};
