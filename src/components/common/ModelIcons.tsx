import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/**
 * Anthropic (Claude) signature geometric starburst / asterisk icon
 */
export const AnthropicClaudeIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M13.82 3.5h3.86l4.82 17h-3.86l-1.02-3.72H11.9l-1.02 3.72H7.02l4.82-17h1.98zm1.8 10.38l-1.74-6.36-1.74 6.36h3.48zM1.5 20.5l4.82-17h3.86l-4.82 17H1.5z" />
  </svg>
);

/**
 * Google Gemini signature 4-point curved diamond sparkle icon
 */
export const GoogleGeminiIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    <path
      d="M12 2C12 7.523 7.523 12 2 12C7.523 12 12 16.477 12 22C12 16.477 16.477 12 22 12C16.477 12 12 7.523 12 2Z"
      fill="currentColor"
    />
  </svg>
);

/**
 * OpenAI (ChatGPT / GPT-4o / GPT-6) signature 6-spoke rosette spiral logo
 */
export const OpenAIIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M19.2 14.5a4.2 4.2 0 0 0 .3-1.5 4.3 4.3 0 0 0-4.3-4.3h-.7a4.3 4.3 0 0 0-7.8-2.3 4.3 4.3 0 0 0-3.8 2.2 4.3 4.3 0 0 0 .5 4.7 4.3 4.3 0 0 0 1.5 7.6 4.3 4.3 0 0 0 7.8 2.3 4.3 4.3 0 0 0 3.8-2.2 4.3 4.3 0 0 0-.5-4.7 4.3 4.3 0 0 0-1.5-1.8z" />
    <path d="M12 7.5v9" />
    <path d="M7.8 14.8l7.8-4.5" />
    <path d="M7.8 9.2l7.8 4.5" />
  </svg>
);

/**
 * xAI (Grok) signature geometric slash X logo
 */
export const XAIGrokIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/**
 * DeepSeek signature whale & ocean wave fin icon
 */
export const DeepSeekIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2.5 14c2-4 6-7 11-7 4 0 7 2 8 6-3 1-6 1-9-1-2-1.5-4-1.5-6 0-1.5 1-2.8 1.5-4 2z" fill="currentColor" fillOpacity="0.2" />
    <path d="M2.5 14c2-4 6-7 11-7 4 0 7 2 8 6-3 1-6 1-9-1-2-1.5-4-1.5-6 0-1.5 1-2.8 1.5-4 2z" />
    <circle cx="16" cy="10" r="1" fill="currentColor" />
    <path d="M18 7c1-2 3-3 5-3-1 2-1 4 0 6" />
  </svg>
);

/**
 * Moonshot (Kimi) signature planetary crescent orbit icon
 */
export const MoonshotKimiIcon: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.79c.4-.29.84-.52 1.3-.68A8.96 8.96 0 0 0 12 3z" fill="currentColor" fillOpacity="0.2" />
    <circle cx="12" cy="12" r="8" />
    <path d="M4.93 4.93l14.14 14.14" strokeDasharray="2 2" />
  </svg>
);
