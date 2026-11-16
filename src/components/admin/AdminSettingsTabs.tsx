import React from 'react';
import { Activity, Save, Smartphone } from 'lucide-react';
import { EmailSettingsCard } from './EmailSettingsCard.tsx';
import { SeoSettingsCard } from './SeoSettingsCard.tsx';

interface MfsGatewaysTabProps {
  globalSettings: any;
  setGlobalSettings: React.Dispatch<React.SetStateAction<any>>;
  savingSettings: boolean;
  onToggleMfsGateway: (key: 'bkash_enabled' | 'nagad_enabled' | 'rocket_enabled', label: string) => void;
  onSaveMfsNumbers: (e: React.FormEvent) => void;
}

export const MfsGatewaysTab: React.FC<MfsGatewaysTabProps> = ({
  globalSettings,
  setGlobalSettings,
  savingSettings,
  onToggleMfsGateway,
  onSaveMfsNumbers
}) => {
  const gateways: Array<{
    enabledKey: 'bkash_enabled' | 'nagad_enabled' | 'rocket_enabled';
    numberKey: 'bkash_number' | 'nagad_number' | 'rocket_number';
    label: string;
    testId: string;
    placeholder: string;
    accentClass: string;
  }> = [
    {
      enabledKey: 'bkash_enabled',
      numberKey: 'bkash_number',
      label: 'bKash',
      testId: 'admin-toggle-bkash',
      placeholder: '01812345678',
      accentClass: 'text-[#E2136E] bg-pink-50 dark:bg-pink-950/35 border-pink-200 dark:border-pink-900'
    },
    {
      enabledKey: 'nagad_enabled',
      numberKey: 'nagad_number',
      label: 'Nagad',
      testId: 'admin-toggle-nagad',
      placeholder: '01712345678',
      accentClass: 'text-[#F7941D] bg-orange-50 dark:bg-orange-950/35 border-orange-200 dark:border-orange-900'
    },
    {
      enabledKey: 'rocket_enabled',
      numberKey: 'rocket_number',
      label: 'Rocket',
      testId: 'admin-toggle-rocket',
      placeholder: '01912345678',
      accentClass: 'text-[#8C3494] bg-purple-50 dark:bg-purple-950/35 border-purple-200 dark:border-purple-900'
    }
  ];

  return (
    <form onSubmit={onSaveMfsNumbers} className="space-y-4 max-w-3xl text-xs">
      <div className="bg-white dark:bg-[#1e1f20] p-5 sm:p-6 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] space-y-5">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <Smartphone className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">
                MFS Payment Gateways &amp; Receiving Numbers
              </h3>
              <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] mt-0.5 leading-relaxed">
                Toggle any method OFF immediately when a SIM limit is reached. Customers in Checkout will only see active methods. At least one gateway must remain enabled.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0 whitespace-nowrap">
            Live Sync
          </span>
        </div>

        <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {gateways.map(gw => {
            const active = globalSettings[gw.enabledKey] !== false;
            return (
              <div key={gw.enabledKey} className="py-4 first:pt-1 last:pb-1 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase font-mono border ${gw.accentClass}`}>
                      {gw.label}
                    </span>
                    <label
                      htmlFor={`mfs-number-${gw.numberKey}`}
                      className="font-medium text-[#1f1f1f] dark:text-[#e3e3e3]"
                    >
                      Merchant / Personal Number
                    </label>
                  </div>

                  <button
                    type="button"
                    data-testid={gw.testId}
                    onClick={() => onToggleMfsGateway(gw.enabledKey, gw.label)}
                    className={`h-7 px-3 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                        : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span>{active ? 'Active in Checkout · Turn OFF' : 'Off (Hidden) · Turn ON'}</span>
                  </button>
                </div>

                <input
                  id={`mfs-number-${gw.numberKey}`}
                  type="text"
                  value={globalSettings[gw.numberKey] || ''}
                  onChange={e =>
                    setGlobalSettings({ ...globalSettings, [gw.numberKey]: e.target.value })
                  }
                  placeholder={gw.placeholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
                />
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex justify-end">
          <button
            type="submit"
            disabled={savingSettings}
            data-testid="save-mfs-btn"
            className="h-9 px-5 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingSettings ? 'Saving...' : 'Save MFS Numbers'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};

interface MetaPixelTabProps {
  globalSettings: any;
  setGlobalSettings: React.Dispatch<React.SetStateAction<any>>;
  savingSettings: boolean;
  testingPixel: boolean;
  onTestPixel: () => void;
  onSavePixel: (e: React.FormEvent) => void;
}

export const MetaPixelTab: React.FC<MetaPixelTabProps> = ({
  globalSettings,
  setGlobalSettings,
  savingSettings,
  testingPixel,
  onTestPixel,
  onSavePixel
}) => {
  return (
    <form onSubmit={onSavePixel} className="max-w-3xl text-xs">
      <div className="bg-white dark:bg-[#1e1f20] p-5 sm:p-6 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-4 h-4 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">
                Facebook / Meta Pixel &amp; Conversions API
              </h3>
              <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6]">
                Tracks PageView, InitiateCheckout, AddPaymentInfo, and BDT Purchase conversions.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={!!globalSettings.facebook_pixel_enabled}
              onChange={e =>
                setGlobalSettings({ ...globalSettings, facebook_pixel_enabled: e.target.checked })
              }
              className="rounded w-4 h-4 text-[#1f1f1f] cursor-pointer"
            />
            <span className="font-semibold text-xs text-[#1f1f1f] dark:text-[#e3e3e3]">
              Enable Pixel
            </span>
          </label>
        </div>

        <div>
          <label
            htmlFor="meta-pixel-id"
            className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]"
          >
            Meta Pixel ID:
          </label>
          <input
            id="meta-pixel-id"
            type="text"
            value={globalSettings.facebook_pixel_id || ''}
            onChange={e =>
              setGlobalSettings({ ...globalSettings, facebook_pixel_id: e.target.value.trim() })
            }
            placeholder="e.g. 123456789012345"
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
          />
          <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block mt-1">
            Found in Meta Events Manager &gt; Data Sources &gt; Pixel Settings.
          </span>
        </div>

        <div>
          <label
            htmlFor="meta-pixel-capi-token"
            className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]"
          >
            Meta Conversions API (CAPI) Access Token (Server-Side Tracking):
          </label>
          <input
            id="meta-pixel-capi-token"
            type="password"
            value={globalSettings.facebook_pixel_access_token || ''}
            onChange={e =>
              setGlobalSettings({
                ...globalSettings,
                facebook_pixel_access_token: e.target.value.trim()
              })
            }
            placeholder="EAAB..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
          />
          <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6] block mt-1">
            Sends server-to-server Purchase events when you approve an order, bypassing ad blockers.
          </span>
        </div>

        <div>
          <label
            htmlFor="meta-pixel-test-code"
            className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]"
          >
            Test Event Code (Optional for Meta Testing):
          </label>
          <input
            id="meta-pixel-test-code"
            type="text"
            value={globalSettings.facebook_pixel_test_code || ''}
            onChange={e =>
              setGlobalSettings({
                ...globalSettings,
                facebook_pixel_test_code: e.target.value.trim()
              })
            }
            placeholder="e.g. TEST12345"
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
          />
        </div>

        <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={testingPixel || !globalSettings.facebook_pixel_id}
              onClick={onTestPixel}
              className="h-9 px-4 rounded-full border border-black/[0.1] dark:border-white/[0.12] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-[#1f1f1f] dark:text-[#e3e3e3] shrink-0" />
              <span>{testingPixel ? 'Sending Test...' : 'Send Test Purchase Event'}</span>
            </button>
            <span className="text-[10px] text-[#444746] dark:text-[#9aa0a6]">
              Check Meta Events Manager &gt; Test Events
            </span>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            data-testid="save-pixel-btn"
            className="h-9 px-5 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingSettings ? 'Saving...' : 'Save Meta Pixel'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};

interface EmailSystemTabProps {
  token: string | null;
  globalSettings: any;
  setGlobalSettings: React.Dispatch<React.SetStateAction<any>>;
  webhookUrlInput: string;
  setWebhookUrlInput: React.Dispatch<React.SetStateAction<string>>;
  webhookSecretInput: string;
  setWebhookSecretInput: React.Dispatch<React.SetStateAction<string>>;
  savingSettings: boolean;
  setFeedback: (msg: string | null) => void;
  onSaveEmailSettings: (e: React.FormEvent) => void;
}

export const EmailSystemTab: React.FC<EmailSystemTabProps> = ({
  token,
  globalSettings,
  setGlobalSettings,
  webhookUrlInput,
  setWebhookUrlInput,
  webhookSecretInput,
  setWebhookSecretInput,
  savingSettings,
  setFeedback,
  onSaveEmailSettings
}) => {
  return (
    <form onSubmit={onSaveEmailSettings} className="max-w-3xl text-xs">
      <EmailSettingsCard
        token={token}
        globalSettings={globalSettings}
        setGlobalSettings={setGlobalSettings}
        webhookUrlInput={webhookUrlInput}
        setWebhookUrlInput={setWebhookUrlInput}
        webhookSecretInput={webhookSecretInput}
        setWebhookSecretInput={setWebhookSecretInput}
        setFeedback={setFeedback}
        footer={
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              data-testid="save-email-btn"
              className="h-9 px-5 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'Saving...' : 'Save Email Settings'}</span>
            </button>
          </div>
        }
      />
    </form>
  );
};

interface SeoAndSupportTabProps {
  token: string | null;
  globalSettings: any;
  setGlobalSettings: React.Dispatch<React.SetStateAction<any>>;
  savingSettings: boolean;
  setFeedback: (msg: string | null) => void;
  onSaveSeoAndSupport: (e: React.FormEvent) => void;
}

export const SeoAndSupportTab: React.FC<SeoAndSupportTabProps> = ({
  token,
  globalSettings,
  setGlobalSettings,
  savingSettings,
  setFeedback,
  onSaveSeoAndSupport
}) => {
  return (
    <form onSubmit={onSaveSeoAndSupport} className="max-w-3xl space-y-5 text-xs">
      <SeoSettingsCard
        token={token}
        globalSettings={globalSettings}
        setGlobalSettings={setGlobalSettings}
        setFeedback={setFeedback}
      />

      <div className="bg-white dark:bg-[#1e1f20] p-5 sm:p-6 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] space-y-4">
        <div className="pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <h4 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">
            Public Support &amp; Social Contacts
          </h4>
          <p className="text-[11px] text-[#444746] dark:text-[#9aa0a6] mt-0.5">
            Displayed on the Contact page, Footer, and transactional email replies.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="support-email-input"
              className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]"
            >
              Support Email:
            </label>
            <input
              id="support-email-input"
              type="email"
              value={globalSettings.support_email || 'ourbangla.ai@gmail.com'}
              onChange={e =>
                setGlobalSettings({ ...globalSettings, support_email: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
            />
          </div>

          <div>
            <label
              htmlFor="support-phone-input"
              className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]"
            >
              Support Phone / WhatsApp:
            </label>
            <input
              id="support-phone-input"
              type="text"
              value={globalSettings.support_phone || '+880 1622-860128'}
              onChange={e =>
                setGlobalSettings({ ...globalSettings, support_phone: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] font-mono text-xs focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="facebook-page-url-input"
            className="block font-medium mb-1 text-[#1f1f1f] dark:text-[#e3e3e3]"
          >
            Facebook Page Link:
          </label>
          <input
            id="facebook-page-url-input"
            type="text"
            value={
              globalSettings.facebook_page_url ||
              'https://www.facebook.com/profile.php?id=61596472081766'
            }
            onChange={e =>
              setGlobalSettings({ ...globalSettings, facebook_page_url: e.target.value })
            }
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] text-xs font-mono focus:outline-none focus:border-[#1f1f1f] dark:focus:border-[#e3e3e3]"
            placeholder="https://www.facebook.com/..."
          />
        </div>

        <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex justify-end">
          <button
            type="submit"
            disabled={savingSettings}
            data-testid="save-seo-support-btn"
            className="h-9 px-5 rounded-full bg-[#1f1f1f] hover:bg-[#1f1f1f]/90 dark:bg-[#e3e3e3] dark:hover:bg-[#e3e3e3]/90 text-white dark:text-[#131314] font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingSettings ? 'Saving...' : 'Save SEO & Support'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
