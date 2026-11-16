import React from 'react';
import { Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { shouldShowTutorialCta } from '../../utils/tutorial.ts';

export type WatchTutorialVariant = 'solid' | 'outline' | 'ghost' | 'menu-item';
export type WatchTutorialSize = 'sm' | 'md';

interface WatchTutorialButtonProps {
  variant?: WatchTutorialVariant;
  size?: WatchTutorialSize;
  label?: string;
  className?: string;
  testId?: string;
  onAfterClick?: () => void;
}

const VARIANT_CLASSES: Record<WatchTutorialVariant, Record<WatchTutorialSize, string>> = {
  solid: {
    sm: 'h-8 px-3.5 rounded-full bg-[#1f1f1f] hover:bg-[#303134] dark:bg-[#e3e3e3] dark:hover:bg-white text-white dark:text-[#131314] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer',
    md: 'h-10 px-5 rounded-full bg-[#1f1f1f] hover:bg-[#303134] dark:bg-[#e3e3e3] dark:hover:bg-white text-white dark:text-[#131314] text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer',
  },
  outline: {
    sm: 'h-8 px-3.5 rounded-full bg-white dark:bg-[#1e1f20] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] border border-black/[0.1] dark:border-white/[0.12] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer',
    md: 'h-10 px-5 rounded-full bg-white dark:bg-[#1e1f20] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] border border-black/[0.1] dark:border-white/[0.12] text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer',
  },
  ghost: {
    sm: 'h-8 px-3 rounded-full bg-transparent hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] text-[11.5px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer',
    md: 'h-9 px-4 rounded-full bg-transparent hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#9aa0a6] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer',
  },
  'menu-item': {
    sm: 'w-full px-3.5 py-2.5 rounded-xl text-left text-sm text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] flex items-center gap-3 transition-colors cursor-pointer',
    md: 'w-full px-3.5 py-2.5 rounded-xl text-left text-sm text-[#444746] dark:text-[#9aa0a6] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] flex items-center gap-3 transition-colors cursor-pointer',
  },
};

export const WatchTutorialButton: React.FC<WatchTutorialButtonProps> = ({
  variant = 'outline',
  size = 'md',
  label = 'Watch Tutorial',
  className = '',
  testId,
  onAfterClick,
}) => {
  const { user, loading, token, openTutorialModal } = useAuth();

  const visible = shouldShowTutorialCta({
    user,
    loading,
    hasStoredToken: Boolean(token),
  });

  if (!visible) {
    return null;
  }

  const iconClass =
    variant === 'menu-item'
      ? 'w-4 h-4 fill-current shrink-0'
      : size === 'sm'
      ? 'w-3 h-3 fill-current shrink-0'
      : 'w-3.5 h-3.5 fill-current shrink-0';

  const handleClick = () => {
    onAfterClick?.();
    openTutorialModal();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={testId}
      className={`${VARIANT_CLASSES[variant][size]} ${className}`.trim()}
    >
      <Play className={iconClass} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
};
