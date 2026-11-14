export type InstallPlatform = 'ios' | 'android' | 'desktop';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Detects whether the user is running on iOS/iPadOS, Android, or Desktop.
 * Handles modern iPadOS Safari which reports Macintosh + touch points.
 */
export function detectInstallPlatform(
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  maxTouchPoints: number = typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0
): InstallPlatform {
  const ua = userAgent.toLowerCase();

  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (ua.includes('macintosh') && maxTouchPoints > 1);
  if (isIOS) {
    return 'ios';
  }

  if (/android/.test(ua)) {
    return 'android';
  }

  return 'desktop';
}

/**
 * Checks whether the web app is currently running inside an installed standalone PWA window.
 */
export function isStandaloneDisplayMode(win: Window | undefined = typeof window !== 'undefined' ? window : undefined): boolean {
  if (!win) return false;

  const mediaStandalone =
    typeof win.matchMedia === 'function' &&
    (win.matchMedia('(display-mode: standalone)').matches ||
      win.matchMedia('(display-mode: minimal-ui)').matches);

  const iosStandalone =
    (win.navigator as unknown as { standalone?: boolean } | undefined)?.standalone === true;

  return Boolean(mediaStandalone || iosStandalone);
}

/**
 * Determines which action clicking "Download App" should take for the current environment.
 */
export function resolveInstallAction(options: {
  isInstalled: boolean;
  hasNativePrompt: boolean;
  platform: InstallPlatform;
}): 'hidden' | 'native_prompt' | 'ios_guide' | 'desktop_guide' {
  if (options.isInstalled) {
    return 'hidden';
  }
  if (options.hasNativePrompt) {
    return 'native_prompt';
  }
  if (options.platform === 'ios') {
    return 'ios_guide';
  }
  return 'desktop_guide';
}
