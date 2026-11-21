/**
 * Meta (Facebook) Pixel integration helper for Bangla AI
 * Handles client-side tracking for PageView, InitiateCheckout, AddPaymentInfo, and Purchase events,
 * plus capture of `_fbp`, `_fbc` / `fbclid`, and `eventID` deduplication parameters.
 */

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    _metaPixelInitialized?: boolean;
    _metaPixelId?: string;
  }
}

const FBC_STORAGE_KEY = 'bangla_ai_meta_fbc';
const FBP_STORAGE_KEY = 'bangla_ai_meta_fbp';

export interface MetaBrowserAttribution {
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined' || !document.cookie) return undefined;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  if (!match || !match[1]) return undefined;
  try {
    return decodeURIComponent(match[1]).trim() || undefined;
  } catch {
    return match[1].trim() || undefined;
  }
}

function safeStorageGet(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || undefined;
  } catch {
    return undefined;
  }
}

function safeStorageSet(key: string, value: string): void {
  if (typeof window === 'undefined' || !value) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota / privacy mode errors
  }
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Captures Facebook Ad click ID (`fbclid`) and `_fbp`/`_fbc` cookies on initial landing
 * so attribution survives route navigation and cross-browser checkout handoffs.
 */
export function captureMetaAttributionOnLoad(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get('fbclid')?.trim();
    if (fbclid && !/[\r\n\s<>]/.test(fbclid)) {
      const fbcFromUrl = `fb.1.${Date.now()}.${fbclid}`;
      safeStorageSet(FBC_STORAGE_KEY, fbcFromUrl);
    }

    const cookieFbc = readCookie('_fbc');
    if (cookieFbc && cookieFbc.startsWith('fb.')) {
      safeStorageSet(FBC_STORAGE_KEY, cookieFbc);
    }

    const cookieFbp = readCookie('_fbp');
    if (cookieFbp && cookieFbp.startsWith('fb.')) {
      safeStorageSet(FBP_STORAGE_KEY, cookieFbp);
    }
  } catch {
    // Ignore malformed URL or blocked cookie access
  }
}

/**
 * Reads the customer's current `_fbp`, `_fbc` (falling back to stored `fbclid`),
 * and checkout `eventSourceUrl` to send alongside checkout submissions for CAPI matching.
 */
export function getMetaBrowserAttribution(): MetaBrowserAttribution {
  if (typeof window === 'undefined') return {};
  captureMetaAttributionOnLoad();

  const fbp = readCookie('_fbp') || safeStorageGet(FBP_STORAGE_KEY);
  const fbc = readCookie('_fbc') || safeStorageGet(FBC_STORAGE_KEY);
  const eventSourceUrl = window.location?.href || undefined;

  return {
    ...(fbp && fbp.startsWith('fb.') ? { fbp } : {}),
    ...(fbc && fbc.startsWith('fb.') ? { fbc } : {}),
    ...(eventSourceUrl ? { eventSourceUrl } : {}),
  };
}

/**
 * Generates a unique Meta eventID shared between browser Pixel and server CAPI for deduplication.
 */
export function generateMetaEventId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${randomPart}`;
}

/**
 * Initializes the Meta Pixel script dynamically with the given Pixel ID
 */
export function initMetaPixel(pixelId: string): void {
  if (typeof window === 'undefined') return;
  captureMetaAttributionOnLoad();
  if (!pixelId || window._metaPixelInitialized) return;

  try {
    // Official Meta Pixel Code base snippet
    /* eslint-disable */
    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      if (s && s.parentNode) {
        s.parentNode.insertBefore(t, s);
      } else {
        b.head.appendChild(t);
      }
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    if (window.fbq) {
      // Disable Meta's Automatic Events (autoConfig) so button clicks cannot fire
      // un-deduplicated automatic browser Purchase / Subscribe events on top of CAPI.
      window.fbq('set', 'autoConfig', false, pixelId);
      window.fbq('init', pixelId);
      window._metaPixelInitialized = true;
      window._metaPixelId = pixelId;
      const currentPath = `${window.location.pathname}${window.location.search}`;
      (window as any)._metaLastPageViewPath = currentPath;
      window.fbq('track', 'PageView');
      console.log(`[Meta Pixel] Initialized successfully with Pixel ID: ${pixelId} (autoConfig=false)`);
    }
  } catch (err) {
    console.warn('[Meta Pixel] Initialization failed or blocked by client:', err);
  }
}

/**
 * Safe generic event tracker with optional `eventID` for CAPI deduplication
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, any>,
  eventId?: string
): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  try {
    if (eventId) {
      window.fbq('track', eventName, params || {}, { eventID: eventId });
    } else if (params) {
      window.fbq('track', eventName, params);
    } else {
      window.fbq('track', eventName);
    }
    console.log(`[Meta Pixel] Event tracked: ${eventName}`, params, eventId ? { eventID: eventId } : '');
  } catch (err) {
    console.warn(`[Meta Pixel] Could not track event ${eventName}:`, err);
  }
}

/**
 * Tracks standard PageView (deduplicated per path so initial mount does not double-fire)
 */
export function trackMetaPageView(): void {
  if (typeof window === 'undefined' || !window.fbq || !window._metaPixelInitialized) return;
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if ((window as any)._metaLastPageViewPath === currentPath) return;
  (window as any)._metaLastPageViewPath = currentPath;
  trackMetaEvent('PageView');
}

/**
 * Tracks InitiateCheckout when user selects a subscription plan
 */
export function trackMetaInitiateCheckout(
  planName: string,
  priceBDT: number,
  eventId?: string
): void {
  trackMetaEvent(
    'InitiateCheckout',
    {
      content_name: planName,
      content_category: 'AI Subscription',
      value: priceBDT,
      currency: 'BDT',
      num_items: 1,
    },
    eventId
  );
}

/**
 * Tracks AddPaymentInfo when user submits MFS (bKash/Nagad/Rocket) transaction details
 */
export function trackMetaAddPaymentInfo(
  planName: string,
  priceBDT: number,
  gateway: string,
  eventId?: string
): void {
  trackMetaEvent(
    'AddPaymentInfo',
    {
      content_name: planName,
      value: priceBDT,
      currency: 'BDT',
      payment_method: gateway,
    },
    eventId
  );
}

/**
 * Tracks Purchase event (intended only for customer-side browser flows sharing the CAPI `eventID`)
 */
export function trackMetaPurchase(
  planName: string,
  priceBDT: number,
  trxId: string,
  gateway: string,
  eventId?: string
): void {
  trackMetaEvent(
    'Purchase',
    {
      content_name: planName,
      content_type: 'product',
      value: priceBDT,
      currency: 'BDT',
      order_id: trxId,
      payment_method: gateway,
    },
    eventId
  );
}
