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
      className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 border border-black/10 dark:border-white/15 select-none ${className}`}
    >
      <img
        src="/assets/aistudio/for_white_theme__de4bccba.png"
        alt={alt}
        className="w-full h-full object-cover scale-[1.08] block dark:hidden"
      />
      <img
        src="/assets/aistudio/for_black_theme__6e900797.png"
        alt={alt}
        className="w-full h-full object-cover scale-[1.08] hidden dark:block"
      />
    </span>
  );
};
