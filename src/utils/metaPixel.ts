/**
 * Meta Tracking Helper for Bangla AI — 100% Pure Server-Side Conversions API (CAPI) Mode.
 *
 * We intentionally DO NOT load Meta's third-party `fbevents.js` browser script because
 * saved Meta Event Setup Tool (`cs_est`) rules and Automatic Events tied to the Pixel ID
 * execute remotely inside `fbevents.js` and fire fake browser `Purchase` events on button clicks.
 *
 * Instead:
 * 1. First-party `_fbp` and `_fbc` (from `?fbclid=...`) cookies are captured & persisted locally
 *    using Meta's official `fb.1.<timestamp>.<id>` format for full 7-day click attribution.
 * 2. `PageView` and `InitiateCheckout` are relayed directly to `/api/meta/track` -> Meta CAPI.
 * 3. `AddPaymentInfo` is sent server-side by `server.ts` on checkout submission.
 * 4. `Purchase` is STRICTLY sent server-side by `server.ts` ONLY when an admin approves a real order.
 */

declare global {
  interface Window {
    _metaPixelInitialized?: boolean;
    _metaPixelId?: string;
    _metaLastPageViewPath?: string;
  }
}

const FBC_STORAGE_KEY = 'bangla_ai_meta_fbc';
const FBP_STORAGE_KEY = 'bangla_ai_meta_fbp';
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days (Meta standard)

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

function writeFirstPartyCookie(name: string, value: string): void {
  if (typeof document === 'undefined' || !value) return;
  try {
    const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secureFlag}`;
  } catch {
    // Ignore restricted cookie contexts
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
 * Generates a Meta CAPI-compliant first-party `_fbp` browser identifier:
 * `fb.1.<unix_timestamp_ms>.<10_digit_random>`
 */
export function generateFirstPartyFbp(nowMs: number = Date.now()): string {
  let randomNum: number;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    randomNum = 1_000_000_000 + (arr[0] % 9_000_000_000);
  } else {
    randomNum = Math.floor(1_000_000_000 + Math.random() * 9_000_000_000);
  }
  return `fb.1.${Math.floor(nowMs)}.${randomNum}`;
}

/**
 * Formats a Meta CAPI-compliant `_fbc` click identifier from URL `fbclid`.
 */
export function buildFirstPartyFbcFromFbclid(
  fbclid: string,
  nowMs: number = Date.now()
): string | undefined {
  const cleaned = fbclid.trim();
  if (!cleaned || cleaned.length > 400 || /[\r\n\s<>]/.test(cleaned)) {
    return undefined;
  }
  return `fb.1.${Math.floor(nowMs)}.${cleaned}`;
}

/**
 * Captures Facebook Ad click ID (`fbclid`) into first-party `_fbc` and guarantees
 * a persistent first-party `_fbp` cookie so CAPI sales attribution works accurately
 * without loading Meta's browser `fbevents.js` script.
 */
export function captureMetaAttributionOnLoad(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get('fbclid')?.trim();
    if (fbclid) {
      const fbcFromUrl = buildFirstPartyFbcFromFbclid(fbclid);
      if (fbcFromUrl) {
        writeFirstPartyCookie('_fbc', fbcFromUrl);
        safeStorageSet(FBC_STORAGE_KEY, fbcFromUrl);
      }
    } else {
      const cookieFbc = readCookie('_fbc');
      if (cookieFbc && cookieFbc.startsWith('fb.')) {
        safeStorageSet(FBC_STORAGE_KEY, cookieFbc);
      }
    }

    const existingFbp = readCookie('_fbp') || safeStorageGet(FBP_STORAGE_KEY);
    if (existingFbp && existingFbp.startsWith('fb.')) {
      writeFirstPartyCookie('_fbp', existingFbp);
      safeStorageSet(FBP_STORAGE_KEY, existingFbp);
    } else {
      const freshFbp = generateFirstPartyFbp();
      writeFirstPartyCookie('_fbp', freshFbp);
      safeStorageSet(FBP_STORAGE_KEY, freshFbp);
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
 * Generates a unique Meta eventID for CAPI tracking.
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

function sendServerFunnelEvent(payload: {
  eventName: 'PageView' | 'InitiateCheckout';
  eventId?: string;
  planName?: string;
  valueBdt?: number;
}): void {
  if (typeof window === 'undefined' || !window._metaPixelInitialized || isAdminRoute()) return;
  try {
    const attribution = getMetaBrowserAttribution();
    const body = JSON.stringify({
      eventName: payload.eventName,
      eventId: payload.eventId || generateMetaEventId(payload.eventName === 'InitiateCheckout' ? 'ic' : 'pv'),
      planName: payload.planName,
      valueBdt: payload.valueBdt,
      fbp: attribution.fbp,
      fbc: attribution.fbc,
      eventSourceUrl: attribution.eventSourceUrl,
    });

    void fetch('/api/meta/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Non-blocking telemetry
    });
  } catch {
    // Ignore client network restrictions
  }
}

/**
 * Initializes Pure Server-Side Meta CAPI tracking (WITHOUT injecting `fbevents.js`).
 */
export function initMetaPixel(pixelId: string): void {
  if (typeof window === 'undefined' || isAdminRoute()) return;
  captureMetaAttributionOnLoad();
  if (!pixelId || window._metaPixelInitialized) return;

  window._metaPixelInitialized = true;
  window._metaPixelId = pixelId;
  const currentPath = `${window.location.pathname}${window.location.search}`;
  window._metaLastPageViewPath = currentPath;
  sendServerFunnelEvent({ eventName: 'PageView' });
}

/**
 * Safe generic event tracker — strictly forwards only PageView and InitiateCheckout
 * to server-side CAPI. Client-side Purchase is permanently blocked.
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, any>,
  eventId?: string
): void {
  if (typeof window === 'undefined' || !window._metaPixelInitialized || isAdminRoute()) return;
  const normalized = eventName.trim().toLowerCase();
  if (normalized === 'pageview') {
    sendServerFunnelEvent({ eventName: 'PageView', eventId });
    return;
  }
  if (normalized === 'initiatecheckout') {
    sendServerFunnelEvent({
      eventName: 'InitiateCheckout',
      eventId,
      planName: typeof params?.content_name === 'string' ? params.content_name : undefined,
      valueBdt: params?.value !== undefined ? Number(params.value) : undefined,
    });
  }
}

/**
 * Tracks PageView via Server-Side CAPI (deduplicated per path).
 */
export function trackMetaPageView(): void {
  if (typeof window === 'undefined' || !window._metaPixelInitialized || isAdminRoute()) return;
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (window._metaLastPageViewPath === currentPath) return;
  window._metaLastPageViewPath = currentPath;
  sendServerFunnelEvent({ eventName: 'PageView' });
}

/**
 * Tracks InitiateCheckout via Server-Side CAPI when user selects a subscription plan.
 */
export function trackMetaInitiateCheckout(
  planName: string,
  priceBDT: number,
  eventId?: string
): void {
  sendServerFunnelEvent({
    eventName: 'InitiateCheckout',
    eventId,
    planName,
    valueBdt: priceBDT,
  });
}

/**
 * No-op in browser: AddPaymentInfo is already dispatched server-side via Meta CAPI
 * in `server.ts` when checkout submission succeeds.
 */
export function trackMetaAddPaymentInfo(
  _planName: string,
  _priceBDT: number,
  _gateway: string,
  _eventId?: string
): void {
  // Handled exclusively via Server-Side CAPI on checkout submission.
}

/**
 * No-op in browser: Purchase events fire strictly via Server-Side CAPI upon admin approval.
 */
export function trackMetaPurchase(
  _planName: string,
  _priceBDT: number,
  _trxId: string,
  _gateway: string,
  _eventId?: string
): void {
  // Handled exclusively via Server-Side CAPI when an admin approves a real payment.
}
