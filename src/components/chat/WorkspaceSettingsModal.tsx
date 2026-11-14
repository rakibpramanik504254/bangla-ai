import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AccountBillingPanel } from '../account/AccountBillingPanel.tsx';

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateHome?: () => void;
  onNavigateAccount?: () => void;
  onNavigateAdmin?: () => void;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  isOpen,
  onClose,
  onNavigateHome,
  onNavigateAdmin,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account and Billing"
      data-testid="workspace-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#1e1f20] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden text-[#1f1f1f] dark:text-[#e3e3e3]"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight">
              Account &amp; Billing
            </h2>
            <p className="text-xs text-[#444746] dark:text-[#9aa0a6] truncate">
              Manage your profile, appearance, subscription quota, and payment history
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Unified Account & Billing Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <AccountBillingPanel
            compact
            onCloseModal={onClose}
            onNavigateHome={onNavigateHome}
            onNavigateAdmin={onNavigateAdmin}
          />
        </div>
      </div>
    </div>
  );
};
