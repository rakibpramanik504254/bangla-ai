import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  BeforeInstallPromptEvent,
  InstallPlatform,
  detectInstallPlatform,
  isStandaloneDisplayMode,
  resolveInstallAction,
} from '../utils/appInstall.ts';

export type InstallGuideMode = 'ios' | 'desktop' | null;

interface AppInstallContextValue {
  isInstalled: boolean;
  isInstallable: boolean;
  platform: InstallPlatform;
  guideMode: InstallGuideMode;
  triggerInstall: () => Promise<void>;
  closeGuide: () => void;
}

const AppInstallContext = createContext<AppInstallContextValue | null>(null);

export const AppInstallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandaloneDisplayMode());
  const [platform, setPlatform] = useState<InstallPlatform>(() => detectInstallPlatform());
  const [guideMode, setGuideMode] = useState<InstallGuideMode>(null);

  useEffect(() => {
    setPlatform(detectInstallPlatform());
    setIsInstalled(isStandaloneDisplayMode());

    const mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)')
        : null;

    const handleDisplayModeChange = () => {
      if (isStandaloneDisplayMode()) {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setGuideMode(null);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setGuideMode(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery?.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery?.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    const action = resolveInstallAction({
      isInstalled,
      hasNativePrompt: Boolean(deferredPrompt),
      platform,
    });

    if (action === 'hidden') return;

    if (action === 'native_prompt' && deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('Native PWA install prompt dismissed or unavailable:', err);
        setGuideMode(platform === 'ios' ? 'ios' : 'desktop');
      }
      return;
    }

    if (action === 'ios_guide') {
      setGuideMode('ios');
      return;
    }

    setGuideMode('desktop');
  }, [deferredPrompt, isInstalled, platform]);

  const closeGuide = useCallback(() => {
    setGuideMode(null);
  }, []);

  return (
    <AppInstallContext.Provider
      value={{
        isInstalled,
        isInstallable: Boolean(deferredPrompt),
        platform,
        guideMode,
        triggerInstall,
        closeGuide,
      }}
    >
      {children}
    </AppInstallContext.Provider>
  );
};

export function useAppInstall(): AppInstallContextValue {
  const ctx = useContext(AppInstallContext);
  if (!ctx) {
    throw new Error('useAppInstall must be used inside AppInstallProvider');
  }
  return ctx;
}
