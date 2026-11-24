import React from 'react';

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = 'w-7 h-7',
  alt = 'Bangla AI Logo',
}) => {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <img
        src="/assets/aistudio/3_cb0072e9.png"
        alt={alt}
        className="w-full h-full object-contain block"
      />
    </span>
  );
};

interface BrandWordmarkProps {
  className?: string;
  alt?: string;
}

/**
 * Full Bangla AI wordmark lockup with automatic light/dark asset switching.
 * Crops the 1000x1000 source canvas tightly around the horizontal wordmark bounds.
 */
export const BrandWordmark: React.FC<BrandWordmarkProps> = ({
  className = 'h-12 w-[96px]',
  alt = 'Bangla AI',
}) => {
  return (
    <span
      className={`relative inline-flex items-center overflow-hidden shrink-0 select-none ${className}`}
    >
      <img
        src="/assets/aistudio/2_94923766.png"
        alt={alt}
        className="w-[162%] max-w-none -ml-[34%] object-contain block dark:hidden pointer-events-none"
      />
      <img
        src="/assets/aistudio/1_aa3cea4a.png"
        alt={alt}
        className="w-[162%] max-w-none -ml-[34%] object-contain hidden dark:block pointer-events-none"
      />
    </span>
  );
};
