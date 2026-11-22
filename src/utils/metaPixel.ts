/**
 * Meta (Facebook) Pixel integration helper for Bangla AI
 * Handles client-side tracking for PageView, InitiateCheckout, and AddPaymentInfo,
 * plus capture of `_fbp`, `_fbc` / `fbclid`, and `eventID` deduplication parameters.
 *
 * IMPORTANT: `Purchase` events are strictly Server-Side CAPI only (fired exclusively
 * when an admin approves a payment). A browser-level Meta `/tr` firewall is installed
 * before `fbevents.js` loads so legacy Meta Event Setup Tool (`cs_est`) or Automatic
 * Events rules saved in Meta Events Manager can NEVER fire fake browser `Purchase` events.
 */

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    _metaPixelInitialized?: boolean;
    _metaPixelId?: string;
    _metaPurchaseFirewallInstalled?: boolean;
  }
}

const FBC_STORAGE_KEY = 'bangla_ai_meta_fbc';
const FBP_STORAGE_KEY = 'bangla_ai_meta_fbp';

export interface MetaBrowserAttribution {
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
}

const META_TRACKING_URL_REGEX = /(?:^|\/\/)(?:www\.|m\.)?facebook\.com\/tr(?:\/|\?|$)/i;

function safeDecodeURIComponent(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

function serializedBodyHasBlockedMetaSignal(raw: string): boolean {
  if (!raw) return false;
  const decoded = safeDecodeURIComponent(raw);
  if (/(?:^|[?&])ev=purchase(?:&|$)/i.test(raw) || /(?:^|[?&])ev=purchase(?:&|$)/i.test(decoded)) {
    return true;
  }
  if (/(?:^|[?&])(?:cd\[cs_est\]|cs_est)=/i.test(decoded)) {
    return true;
  }
  return false;
}

/**
 * Determines whether an outgoing browser beacon to Meta Pixel's `/tr` endpoint is an
 * unauthorized browser `Purchase` or Meta Event Setup Tool (`cs_est`) event that must be blocked.
 * Legitimate browser events (`PageView`, `InitiateCheckout`, `AddPaymentInfo`) are always allowed.
 */
export function isBlockedMetaBrowserBeacon(
  url: unknown,
  body?: unknown
): boolean {
  if (typeof url !== 'string' || !META_TRACKING_URL_REGEX.test(url)) {
    return false;
  }

  // 1. Inspect URL query string
  const qIndex = url.indexOf('?');
  if (qIndex !== -1) {
    const queryStr = url.slice(qIndex + 1);
    if (serializedBodyHasBlockedMetaSignal(queryStr)) {
      return true;
    }
  }

  // 2. Inspect optional POST/Beacon body (FormData, URLSearchParams, or query string)
  if (body) {
    if (typeof body === 'string') {
      if (serializedBodyHasBlockedMetaSignal(body)) return true;
    } else if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
      if (serializedBodyHasBlockedMetaSignal(body.toString())) return true;
    } else if (typeof FormData !== 'undefined' && body instanceof FormData) {
      for (const [k, v] of body.entries()) {
        const keyLower = String(k).toLowerCase();
        const valLower = typeof v === 'string' ? v.trim().toLowerCase() : '';
        if (keyLower === 'ev' && valLower === 'purchase') return true;
        if (keyLower === 'cs_est' || keyLower === 'cd[cs_est]') return true;
      }
    }
  }

  return false;
}

/**
 * Installs a lightweight client-side firewall BEFORE `fbevents.js` loads to drop any
 * browser-originated Meta Pixel `Purchase` or Event Setup Tool (`cs_est`) beacons.
 * Server-side Conversions API `Purchase` events (fired only on admin payment approval)
 * are unaffected.
 */
export function installMetaBrowserPurchaseFirewall(): void {
  if (typeof window === 'undefined' || window._metaPurchaseFirewallInstalled) return;
  window._metaPurchaseFirewallInstalled = true;

  try {
    // 1. Guard navigator.sendBeacon
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const originalSendBeacon = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = (url: string | URL, data?: BodyInit | null): boolean => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (isBlockedMetaBrowserBeacon(urlStr, data)) {
          console.info('[Meta Pixel Firewall] Blocked unauthorized browser Purchase/cs_est sendBeacon.');
          return true; // Pretend accepted so fbevents.js does not fall back to Image/form
        }
        return originalSendBeacon(url, data);
      };
    }

    // 2. Guard window.fetch
    if (typeof window.fetch === 'function') {
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const urlStr =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input?.url || '';
        if (isBlockedMetaBrowserBeacon(urlStr, init?.body)) {
          console.info('[Meta Pixel Firewall] Blocked unauthorized browser Purchase/cs_est fetch.');
          return Promise.resolve(new Response('', { status: 204 }));
        }
        return originalFetch(input, init);
      };
    }

    // 3. Guard HTMLImageElement.prototype.src (Meta's primary GET pixel beacon)
    if (typeof HTMLImageElement !== 'undefined') {
      const srcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      if (srcDesc?.set && srcDesc?.get) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
          configurable: true,
          enumerable: srcDesc.enumerable,
          get() {
            return srcDesc.get!.call(this);
          },
          set(value: string) {
            if (isBlockedMetaBrowserBeacon(value)) {
              console.info('[Meta Pixel Firewall] Blocked unauthorized browser Purchase/cs_est Image beacon.');
              return;
            }
            srcDesc.set!.call(this, value);
          }
        });
      }

      const originalSetAttr = HTMLImageElement.prototype.setAttribute;
      HTMLImageElement.prototype.setAttribute = function (name: string, value: string) {
        if (name.toLowerCase() === 'src' && isBlockedMetaBrowserBeacon(value)) {
          console.info('[Meta Pixel Firewall] Blocked unauthorized browser Purchase/cs_est Image setAttribute.');
          return;
        }
        return originalSetAttr.call(this, name, value);
      };
    }

    // 4. Guard HTMLFormElement.prototype.submit (Meta's iframe POST fallback)
    if (typeof HTMLFormElement !== 'undefined' && typeof HTMLFormElement.prototype.submit === 'function') {
      const originalSubmit = HTMLFormElement.prototype.submit;
      HTMLFormElement.prototype.submit = function () {
        const action = this.getAttribute('action') || this.action || '';
        if (META_TRACKING_URL_REGEX.test(action)) {
          const inputs = Array.from(this.querySelectorAll('input[name]')) as HTMLInputElement[];
          const blocked =
            isBlockedMetaBrowserBeacon(action) ||
            inputs.some(inp => {
              const nameLower = (inp.name || '').toLowerCase();
              const valLower = (inp.value || '').trim().toLowerCase();
              return (
                (nameLower === 'ev' && valLower === 'purchase') ||
                nameLower === 'cs_est' ||
                nameLower === 'cd[cs_est]'
              );
            });
          if (blocked) {
            console.info('[Meta Pixel Firewall] Blocked unauthorized browser Purchase/cs_est form submit.');
            return;
          }
        }
        return originalSubmit.call(this);
      };
    }

    // 5. Guard XMLHttpRequest
    if (typeof XMLHttpRequest !== 'undefined') {
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (
        method: string,
        url: string | URL,
        ...rest: any[]
      ) {
        (this as any)._metaFirewallUrl = typeof url === 'string' ? url : url.toString();
        return (origOpen as any).call(this, method, url, ...rest);
      };
      XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
        const targetUrl = (this as any)._metaFirewallUrl;
        if (isBlockedMetaBrowserBeacon(targetUrl, body)) {
          console.info('[Meta Pixel Firewall] Blocked unauthorized browser Purchase/cs_est XHR.');
          return;
        }
        return origSend.call(this, body);
      };
    }
  } catch (err) {
    console.warn('[Meta Pixel Firewall] Could not install all guards:', err);
  }
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

function isAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/admin');
}

/**
 * Initializes the Meta Pixel script dynamically with the given Pixel ID
 */
export function initMetaPixel(pixelId: string): void {
  if (typeof window === 'undefined' || isAdminRoute()) return;
  installMetaBrowserPurchaseFirewall();
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
      // automatic browser Purchase / Subscribe events on top of CAPI.
      window.fbq('set', 'autoConfig', false, pixelId);
      window.fbq('init', pixelId);
      window._metaPixelInitialized = true;
      window._metaPixelId = pixelId;
      const currentPath = `${window.location.pathname}${window.location.search}`;
      (window as any)._metaLastPageViewPath = currentPath;
      window.fbq('track', 'PageView');
      console.log(`[Meta Pixel] Initialized successfully with Pixel ID: ${pixelId} (autoConfig=false, Purchase firewall active)`);
    }
  } catch (err) {
    console.warn('[Meta Pixel] Initialization failed or blocked by client:', err);
  }
}

/**
 * Safe generic event tracker with optional `eventID` for CAPI deduplication.
 * Browser-side `Purchase` calls are strictly blocked because real Purchase events
 * must only originate from Server-Side CAPI when admin approves a payment.
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, any>,
  eventId?: string
): void {
  if (typeof window === 'undefined' || !window.fbq || isAdminRoute()) return;
  if (eventName.trim().toLowerCase() === 'purchase') {
    console.info('[Meta Pixel] Skipped client-side Purchase event (Purchase is strictly Server-Side CAPI on payment approval).');
    return;
  }
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
  if (typeof window === 'undefined' || !window.fbq || !window._metaPixelInitialized || isAdminRoute()) return;
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
 * Deprecated no-op: Purchase events must only fire server-side via Meta CAPI upon admin approval.
 */
export function trackMetaPurchase(
  _planName: string,
  _priceBDT: number,
  _trxId: string,
  _gateway: string,
  _eventId?: string
): void {
  console.info('[Meta Pixel] Client-side trackMetaPurchase is disabled; Purchase fires strictly via Server CAPI on approval.');
}
