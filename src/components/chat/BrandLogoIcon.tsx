import React from 'react';
import { Sparkles } from 'lucide-react';
import { type BrandIconKey, getBrandLogoSpec } from '../../utils/modelBrandIcons.ts';

interface BrandLogoIconProps {
  iconKey: BrandIconKey;
  sizeClass?: string;
}

export const BrandLogoIcon: React.FC<BrandLogoIconProps> = ({
  iconKey,
  sizeClass = 'w-4 h-4',
}) => {
  const spec = getBrandLogoSpec(iconKey);

  if (spec.assetSrc) {
    return (
      <img
        src={spec.assetSrc}
        alt={spec.label}
        draggable={false}
        className={`${sizeClass} object-contain shrink-0 select-none ${
          spec.invertDark ? 'dark:invert dark:brightness-110' : ''
        }`}
      />
    );
  }

  switch (iconKey) {
    case 'meta':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-label={spec.label}
          className={`${sizeClass} shrink-0 select-none`}
        >
          <path
            d="M4.2 15.8C2.6 13.5 3.3 8.5 6.3 7.3C8.5 6.4 10.6 8.8 12 11.4C13.4 8.8 15.5 6.4 17.7 7.3C20.7 8.5 21.4 13.5 19.8 15.8C18.5 17.7 15.9 17.8 14 15.5C13.2 14.5 12.6 13.3 12 12.2C11.4 13.3 10.8 14.5 10 15.5C8.1 17.8 5.5 17.7 4.2 15.8Z"
            stroke="#0081FB"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'qwen':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-label={spec.label}
          className={`${sizeClass} shrink-0 select-none`}
        >
          <path
            d="M12 2.5L20 7.1V16.9L12 21.5L4 16.9V7.1L12 2.5Z"
            stroke="#615CED"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M12 6.8L16.3 9.3V14.7L12 17.2L7.7 14.7V9.3L12 6.8Z"
            fill="#615CED"
          />
          <path
            d="M14.2 14.5L18.5 19"
            stroke="#615CED"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'mistral':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-label={spec.label}
          className={`${sizeClass} shrink-0 select-none`}
        >
          <rect x="3" y="4" width="3.6" height="3.6" fill="#FFD800" />
          <rect x="17.4" y="4" width="3.6" height="3.6" fill="#FFD800" />
          <rect x="3" y="7.6" width="7.2" height="3.6" fill="#FFAF00" />
          <rect x="13.8" y="7.6" width="7.2" height="3.6" fill="#FFAF00" />
          <rect x="3" y="11.2" width="18" height="3.6" fill="#FF8205" />
          <rect x="3" y="14.8" width="3.6" height="4.2" fill="#FA500F" />
          <rect x="10.2" y="14.8" width="3.6" height="4.2" fill="#FA500F" />
          <rect x="17.4" y="14.8" width="3.6" height="4.2" fill="#FA500F" />
        </svg>
      );

    case 'nvidia':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-label={spec.label}
          className={`${sizeClass} shrink-0 select-none`}
        >
          <path
            d="M10.5 7.2V5C16.2 5.4 20.6 9.5 21 15.2C18.4 17.6 14.8 19 11 19C6.4 19 3 15.7 3 12C3 8.8 5.8 6.4 9.2 6.4"
            stroke="#76B900"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 10.2V8.2C14.3 8.5 17.2 11.1 17.4 14.5C15.5 16 13.2 16.7 10.8 16.7C7.9 16.7 5.8 14.7 5.8 12.3C5.8 10.3 7.5 8.8 9.6 8.8"
            stroke="#76B900"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10.8" cy="12.5" r="1.7" fill="#76B900" />
        </svg>
      );

    case 'cohere':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-label={spec.label}
          className={`${sizeClass} shrink-0 select-none`}
        >
          <path
            d="M4.5 9.5C4.5 6.8 6.8 4.8 10 4.8H14.5C17.4 4.8 19.5 6.5 19.5 8.9C19.5 11.4 17.4 12.8 14 13.2L10.5 13.6C6.9 14 4.5 12.3 4.5 9.5Z"
            fill="#39594D"
          />
          <circle cx="16.2" cy="16.2" r="3.3" fill="#FF7759" />
          <path
            d="M4.5 16.4C4.5 14.7 5.9 13.4 7.7 13.4C9.5 13.4 10.9 14.7 10.9 16.4C10.9 18.1 9.5 19.4 7.7 19.4C5.9 19.4 4.5 18.1 4.5 16.4Z"
            fill="#D18EE2"
          />
        </svg>
      );

    case 'default':
    default:
      return (
        <Sparkles
          aria-label={spec.label}
          className={`${sizeClass} text-[#444746] dark:text-[#9aa0a6] shrink-0`}
        />
      );
  }
};
