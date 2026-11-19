import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';

const TAWK_SCRIPT_ID = 'bangla-ai-tawk-to-script';
const TAWK_EMBED_SRC = 'https://embed.tawk.to/6af9ed4a90c6963c4656a44f/1k7g4drb7';

interface TawkCustomStyle {
  zIndex?: number;
  visibility?: {
    desktop?: {
      position?: 'br' | 'bl' | 'cr' | 'cl' | 'tr' | 'tl';
      xOffset?: number | string;
      yOffset?: number | string;
    };
    mobile?: {
      position?: 'br' | 'bl' | 'cr' | 'cl' | 'tr' | 'tl';
      xOffset?: number | string;
      yOffset?: number | string;
    };
    bubble?: {
      rotate?: string;
      xOffset?: number | string;
      yOffset?: number | string;
    };
  };
}

interface TawkApi {
  customStyle?: TawkCustomStyle;
  onLoad?: () => void;
  showWidget?: () => void;
  hideWidget?: () => void;
  minimize?: () => void;
}

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

export const TawkToWidget: React.FC = () => {
  const { user, token, loading, hasActiveSubscription } = useAuth();

  // Wait while restoring an authenticated session so subscribers never see a flash
  const isResolvingAuth = loading && Boolean(token) && !user;
  const shouldShow = !isResolvingAuth && !hasActiveSubscription;

  const shouldShowRef = useRef(shouldShow);
  const isLoadedRef = useRef(false);
  shouldShowRef.current = shouldShow;

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    if (isResolvingAuth) {
      return;
    }

    if (!shouldShow) {
      if (window.Tawk_API) {
        try {
          window.Tawk_API.minimize?.();
          window.Tawk_API.hideWidget?.();
        } catch {
          // Ignore if widget is not yet initialized
        }
      }
      return;
    }

    // Configure Tawk.to before script execution so it anchors to the bottom-left
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();

    window.Tawk_API.customStyle = {
      zIndex: 39,
      visibility: {
        desktop: {
          position: 'bl',
          xOffset: 20,
          yOffset: 20,
        },
        mobile: {
          position: 'bl',
          xOffset: 16,
          yOffset: 80,
        },
        bubble: {
          rotate: '0deg',
          xOffset: 0,
          yOffset: 0,
        },
      },
    };

    const existingScript = document.getElementById(TAWK_SCRIPT_ID);
    if (!existingScript) {
      const previousOnLoad = window.Tawk_API.onLoad;
      window.Tawk_API.onLoad = () => {
        isLoadedRef.current = true;
        if (typeof previousOnLoad === 'function') {
          try {
            previousOnLoad();
          } catch {
            // Ignore third-party callback issues
          }
        }
        try {
          if (shouldShowRef.current) {
            window.Tawk_API?.showWidget?.();
          } else {
            window.Tawk_API?.minimize?.();
            window.Tawk_API?.hideWidget?.();
          }
        } catch {
          // Ignore Tawk API timing errors
        }
      };

      const script = document.createElement('script');
      script.id = TAWK_SCRIPT_ID;
      script.async = true;
      script.src = TAWK_EMBED_SRC;
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');

      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    } else if (isLoadedRef.current) {
      try {
        window.Tawk_API.showWidget?.();
      } catch {
        // Ignore if widget is transitioning
      }
    }
  }, [isResolvingAuth, shouldShow]);

  return null;
};
