/**
 * Meta (Facebook) Pixel integration helper for Bangla AI
 * Handles client-side tracking for PageView, InitiateCheckout, AddPaymentInfo, and Purchase events.
 */

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    _metaPixelInitialized?: boolean;
    _metaPixelId?: string;
  }
}

/**
 * Initializes the Meta Pixel script dynamically with the given Pixel ID
 */
export function initMetaPixel(pixelId: string): void {
  if (typeof window === 'undefined') return;
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
      window.fbq('init', pixelId);
      window._metaPixelInitialized = true;
      window._metaPixelId = pixelId;
      window.fbq('track', 'PageView');
      console.log(`[Meta Pixel] Initialized successfully with Pixel ID: ${pixelId}`);
    }
  } catch (err) {
    console.warn('[Meta Pixel] Initialization failed or blocked by client:', err);
  }
}

/**
 * Safe generic event tracker
 */
export function trackMetaEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  try {
    window.fbq('track', eventName, params);
    console.log(`[Meta Pixel] Event tracked: ${eventName}`, params);
  } catch (err) {
    console.warn(`[Meta Pixel] Could not track event ${eventName}:`, err);
  }
}

/**
 * Tracks standard PageView
 */
export function trackMetaPageView(): void {
  trackMetaEvent('PageView');
}

/**
 * Tracks InitiateCheckout when user selects a subscription plan
 */
export function trackMetaInitiateCheckout(planName: string, priceBDT: number): void {
  trackMetaEvent('InitiateCheckout', {
    content_name: planName,
    content_category: 'AI Subscription',
    value: priceBDT,
    currency: 'BDT',
    num_items: 1
  });
}

/**
 * Tracks AddPaymentInfo when user submits MFS (bKash/Nagad/Rocket) transaction details
 */
export function trackMetaAddPaymentInfo(planName: string, priceBDT: number, gateway: string): void {
  trackMetaEvent('AddPaymentInfo', {
    content_name: planName,
    value: priceBDT,
    currency: 'BDT',
    payment_method: gateway
  });
}

/**
 * Tracks Purchase event when payment is approved & activated
 */
export function trackMetaPurchase(
  planName: string,
  priceBDT: number,
  trxId: string,
  gateway: string
): void {
  trackMetaEvent('Purchase', {
    content_name: planName,
    content_type: 'product',
    value: priceBDT,
    currency: 'BDT',
    order_id: trxId,
    payment_method: gateway
  });
}
