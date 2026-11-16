import React, { useEffect, useState } from 'react';
import { Mail, Send, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

const APPS_SCRIPT_SETUP_CODE = `const SHARED_SECRET = 'PASTE_OPTIONAL_SECRET_OR_LEAVE_AS_IS';
const SENDER_NAME = 'Bangla AI';

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var data = JSON.parse(raw);

    if (SHARED_SECRET && SHARED_SECRET !== 'PASTE_OPTIONAL_SECRET_OR_LEAVE_AS_IS') {
      if (data.secret !== SHARED_SECRET) {
        return jsonResponse({ ok: false, error: 'Unauthorized webhook secret' });
      }
    }

    if (!data.to || !data.subject) {
      return jsonResponse({ ok: false, error: 'Missing required recipient or subject' });
    }

    var options = {
      name: data.senderName || SENDER_NAME,
      htmlBody: data.html || undefined,
      replyTo: data.replyTo || undefined
    };

    MailApp.sendEmail(String(data.to).trim(), String(data.subject), String(data.text || ''), options);
    return jsonResponse({ ok: true, sentTo: String(data.to).trim() });
  } catch (err) {
    return jsonResponse({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: 'Bangla AI Mail Webhook Active' });
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}`;

interface EmailSettingsCardProps {
  token: string | null;
  globalSettings: any;
  setGlobalSettings: React.Dispatch<React.SetStateAction<any>>;
  webhookUrlInput: string;
  setWebhookUrlInput: React.Dispatch<React.SetStateAction<string>>;
  webhookSecretInput: string;
  setWebhookSecretInput: React.Dispatch<React.SetStateAction<string>>;
  setFeedback: (msg: string | null) => void;
  footer?: React.ReactNode;
}

export const EmailSettingsCard: React.FC<EmailSettingsCardProps> = ({
  token,
  globalSettings,
  setGlobalSettings,
  webhookUrlInput,
  setWebhookUrlInput,
  webhookSecretInput,
  setWebhookSecretInput,
  setFeedback,
  footer
}) => {
  const [testRecipient, setTestRecipient] = useState(
    globalSettings.support_email || 'ourbangla.ai@gmail.com'
  );
  const [sendingTest, setSendingTest] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    if (!testRecipient && globalSettings.support_email) {
      setTestRecipient(globalSettings.support_email);
    }
  }, [globalSettings.support_email, testRecipient]);

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_SETUP_CODE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } catch {
      setFeedback('Could not copy automatically. Please select and copy the script manually.');
    }
  };

  const handleSendTestEmail = async () => {
    if (!token) return;
    setSendingTest(true);
    try {
      const res = await fetch('/api/admin/mail/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          toEmail: testRecipient.trim() || globalSettings.support_email || 'ourbangla.ai@gmail.com',
          ...(webhookUrlInput.trim() ? { webhookUrl: webhookUrlInput.trim() } : {}),
          ...(webhookSecretInput.trim() ? { webhookSecret: webhookSecretInput.trim() } : {})
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(`Mail Error: ${data.error || 'Failed to send test email.'}`);
        return;
      }
      setFeedback(data.message || 'Test email sent successfully! Check your inbox.');
    } catch (err: any) {
      setFeedback(`Mail Error: ${err?.message || 'Network error while testing email.'}`);
    } finally {
      setSendingTest(false);
    }
  };

  const canTestEmail = Boolean(webhookUrlInput.trim() || globalSettings.mail_configured);

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1e1f20] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0" />
          <h4 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">
            Automated Email System (Google Apps Script)
          </h4>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={globalSettings.mail_enabled !== false}
            onChange={e =>
              setGlobalSettings((prev: any) => ({ ...prev, mail_enabled: e.target.checked }))
            }
            className="rounded w-4 h-4 text-[#1f1f1f] cursor-pointer"
          />
          <span className="font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3]">Enable Email</span>
        </label>
      </div>

      <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] leading-[1.7]">
        Sends password reset OTPs, signup welcomes, MFS payment receipts &amp; admin payment alerts directly from{' '}
        <span className="font-mono font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">ourbangla.ai@gmail.com</span>{' '}
        over HTTPS via Google Apps Script (no SMTP ports required).
      </p>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <label className="block font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
            Google Apps Script Web App URL:
          </label>
          {globalSettings.mail_configured ? (
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              Saved ({globalSettings.mail_webhook_source === 'env' ? 'ENV' : 'DB'}):{' '}
              {globalSettings.mail_webhook_url_masked}
            </span>
          ) : (
            <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300">
              Not configured yet
            </span>
          )}
        </div>
        <input
          type="password"
          value={webhookUrlInput}
          onChange={e => {
            const val = e.target.value;
            setWebhookUrlInput(val);
            if (val.trim()) {
              setGlobalSettings((prev: any) => ({ ...prev, mail_enabled: true }));
            }
          }}
          placeholder={
            globalSettings.mail_configured
              ? 'Enter new /exec URL to replace saved webhook...'
              : 'https://script.google.com/macros/s/AKfycb.../exec'
          }
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
        />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <label className="block font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
            Webhook Shared Secret (Optional):
          </label>
          {globalSettings.mail_secret_configured && (
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              Secret Saved
            </span>
          )}
        </div>
        <input
          type="password"
          value={webhookSecretInput}
          onChange={e => setWebhookSecretInput(e.target.value)}
          placeholder={
            globalSettings.mail_secret_configured
              ? 'Leave blank to keep existing secret...'
              : 'Optional secret matching SHARED_SECRET in Code.gs'
          }
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer pt-0.5">
        <input
          type="checkbox"
          checked={globalSettings.mail_notify_admin_on_payment !== false}
          onChange={e =>
            setGlobalSettings((prev: any) => ({
              ...prev,
              mail_notify_admin_on_payment: e.target.checked
            }))
          }
          className="rounded w-4 h-4 text-[#1f1f1f] cursor-pointer"
        />
        <span className="text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
          Email Admin ({globalSettings.support_email || 'ourbangla.ai@gmail.com'}) immediately when a user submits bKash/Nagad/Rocket TrxID
        </span>
      </label>

      {/* Instant Test Email Row */}
      <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
        <label className="block font-medium text-[11px] text-[#444746] dark:text-[#9aa0a6]">
          Test Email Delivery:
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="email"
            value={testRecipient}
            onChange={e => setTestRecipient(e.target.value)}
            placeholder="ourbangla.ai@gmail.com"
            className="flex-1 px-3.5 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
          />
          <button
            type="button"
            disabled={sendingTest || !canTestEmail}
            onClick={handleSendTestEmail}
            className="h-9 px-4 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-[#f0f4f9] dark:bg-[#131314] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingTest ? 'Sending Test...' : 'Send Test Email'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Apps Script Code & Deployment Guide */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowSetupGuide(prev => !prev)}
          className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] hover:opacity-80 flex items-center gap-1.5 cursor-pointer"
        >
          {showSetupGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showSetupGuide ? 'Hide Google Apps Script Setup Code' : 'View Google Apps Script Code (Code.gs)'}</span>
        </button>

        {showSetupGuide && (
          <div className="mt-3 p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                1. Go to script.google.com &rarr; New Project &rarr; Paste Code.gs &rarr; Deploy Web App (Execute as: Me, Access: Anyone)
              </span>
              <button
                type="button"
                onClick={handleCopyScript}
                className="h-7 px-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#1e1f20] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedScript ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedScript ? 'Copied' : 'Copy Code.gs'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-[#131314] text-[#e3e3e3] font-mono text-[11px] overflow-x-auto leading-relaxed max-h-60">
              {APPS_SCRIPT_SETUP_CODE}
            </pre>
          </div>
        )}
      </div>

      {footer && (
        <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
          {footer}
        </div>
      )}
    </div>
  );
};
