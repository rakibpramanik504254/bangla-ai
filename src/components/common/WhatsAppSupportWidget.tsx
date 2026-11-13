import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

const WHATSAPP_NUMBER_DISPLAY = '+880 1622-860128';
const WHATSAPP_NUMBER_WA = '8801622860128';
const DEFAULT_MESSAGE = 'Assalamu Alaikum! I need help with Bangla AI subscription.';

const QUICK_TOPICS = [
  'I want help with Monthly Plan (৳699)',
  'Help with bKash / Nagad / Rocket payment',
  'Question about Yearly Plan (৳5,999)'
];

export const WhatsAppLogo: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16 3C8.82 3 3 8.82 3 16C3 18.46 3.69 20.76 4.88 22.72L3.25 28.75L9.44 27.14C11.33 28.22 13.59 28.84 16 28.84C23.18 28.84 29 23.02 29 15.84C29 8.66 23.18 3 16 3ZM16 26.47C13.84 26.47 11.83 25.85 10.12 24.78L9.7 24.52L6.03 25.48L7.01 21.9L6.73 21.46C5.56 19.69 4.88 17.58 4.88 15.32C4.88 9.95 9.86 5.37 16 5.37C22.14 5.37 26.63 9.95 26.63 15.84C26.63 21.73 22.14 26.47 16 26.47ZM21.97 18.88C21.64 18.72 20.03 17.92 19.73 17.81C19.43 17.7 19.21 17.65 18.99 17.98C18.77 18.31 18.14 19.05 17.95 19.27C17.76 19.49 17.57 19.52 17.24 19.35C16.91 19.19 15.86 18.84 14.61 17.73C13.64 16.86 12.98 15.79 12.79 15.46C12.6 15.13 12.77 14.95 12.94 14.79C13.09 14.64 13.27 14.4 13.43 14.21C13.6 14.02 13.65 13.88 13.76 13.66C13.87 13.44 13.82 13.25 13.73 13.08C13.65 12.92 12.99 11.3 12.72 10.64C12.45 10.01 12.18 10.09 11.98 10.08C11.79 10.07 11.57 10.07 11.35 10.07C11.13 10.07 10.77 10.15 10.47 10.48C10.17 10.81 9.32 11.61 9.32 13.23C9.32 14.85 10.5 16.41 10.66 16.63C10.83 16.85 12.98 20.17 16.29 21.6C17.08 21.94 17.69 22.14 18.17 22.3C18.96 22.55 19.68 22.51 20.25 22.43C20.89 22.33 22.21 21.63 22.48 20.86C22.76 20.09 22.76 19.43 22.67 19.29C22.59 19.15 22.31 19.05 21.97 18.88Z"
      fill="currentColor"
    />
  </svg>
);

export const WhatsAppSupportWidget: React.FC = () => {
  const { user, token, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  // Avoid flashing widget while restoring authenticated session
  if (loading && token && !user) {
    return null;
  }

  // Hide completely for active Monthly or Yearly subscribers (and admins)
  const hasActiveSubscription = Boolean(
    user?.isSubscribed ||
      (user?.subscription &&
        user.subscription.status === 'active' &&
        new Date(user.subscription.expires_at).getTime() > Date.now())
  );

  if (hasActiveSubscription) {
    return null;
  }

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER_WA}?text=${encodeURIComponent(
    message.trim() || DEFAULT_MESSAGE
  )}`;

  return (
    <div
      data-testid="whatsapp-support-widget"
      className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 flex flex-col items-end gap-3"
    >
      {/* Expandable Live Chat Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="WhatsApp Live Support"
          className="w-[calc(100vw-2rem)] max-w-[340px] rounded-[16px] overflow-hidden bg-white dark:bg-[#262626] border border-black/[0.1] dark:border-white/[0.12] shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {/* Header */}
          <div className="bg-[#075E54] dark:bg-[#1B4338] text-white px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                <WhatsAppLogo className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold leading-tight truncate">Bangla AI Live Chat</h3>
                <p className="text-[11px] text-emerald-100/90 font-mono truncate">
                  {WHATSAPP_NUMBER_DISPLAY} • WhatsApp
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close WhatsApp support chat"
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Body */}
          <div className="p-3.5 bg-[#F4F6F5] dark:bg-[#1F1F1F] space-y-3">
            <div className="bg-white dark:bg-[#2A2A2A] rounded-[12px] rounded-tl-xs p-3 border border-black/[0.06] dark:border-white/[0.08] shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#25D366]" />
                <span className="text-[11px] font-semibold text-black dark:text-white">
                  Support Team Online
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Assalamu Alaikum! Need help subscribing with bKash, Nagad, or Rocket? Send us a message on WhatsApp right away.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400 px-0.5">
                Quick Questions
              </p>
              <div className="flex flex-col gap-1.5">
                {QUICK_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setMessage(topic)}
                    className={`text-left text-[11px] px-2.5 py-2 rounded-[8px] border transition-colors cursor-pointer ${
                      message === topic
                        ? 'bg-[#25D366]/10 border-[#25D366]/50 text-black dark:text-white font-medium'
                        : 'bg-white dark:bg-[#262626] border-black/[0.08] dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:border-[#25D366]/50'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Message Composer & Direct WhatsApp Launch */}
          <div className="p-3 bg-white dark:bg-[#262626] border-t border-black/[0.08] dark:border-white/[0.08] space-y-2.5">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your question..."
              aria-label="WhatsApp message"
              className="w-full px-3 py-2 text-xs rounded-[10px] border border-black/[0.12] dark:border-white/[0.15] bg-[#F8F9FA] dark:bg-[#1F1F1F] text-black dark:text-white focus:outline-none focus:border-[#25D366] transition-colors"
            />
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-[10px] bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <WhatsAppLogo className="w-4 h-4" />
              <span>Chat on WhatsApp</span>
              <Send className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close WhatsApp live chat' : 'Open WhatsApp live chat'}
        aria-expanded={isOpen}
        className="group flex items-center justify-center sm:gap-2.5 w-12 h-12 sm:w-auto sm:h-auto sm:px-4 sm:py-3 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-lg shadow-black/15 dark:shadow-black/40 transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
      >
        <WhatsAppLogo className="w-6 h-6 shrink-0" />
        <span className="hidden sm:inline text-xs font-bold tracking-tight whitespace-nowrap">
          {isOpen ? 'Close Chat' : 'Live Support'}
        </span>
      </button>
    </div>
  );
};
