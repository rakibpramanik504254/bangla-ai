import crypto from 'node:crypto';
import { isSyntheticPhoneEmail } from './expressCheckout.ts';

export const META_GRAPH_API_VERSION = 'v21.0';
export const DEFAULT_META_EVENT_SOURCE_URL = 'https://bangla-ai.pro';

export interface MetaCheckoutAttribution {
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  clientUserAgent?: string;
  eventSourceUrl?: string;
}

export interface MetaCapiUserData {
  em?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  country?: string[];
  external_id?: string[];
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
}

export interface MetaCapiPaymentRecord {
  id?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  plan_id?: string;
  plan_name?: string;
  amount: number;
  trx_id: string;
  gateway: string;
  sender_number?: string;
  meta_fbp?: string;
  meta_fbc?: string;
  meta_client_ip?: string;
  meta_client_user_agent?: string;
  meta_event_source_url?: string;
}

export interface MetaCapiUserRecord {
  id?: string;
  email?: string;
  name?: string;
  phone?: string;
}

export function hashMetaValue(normalizedValue: string): string {
  return crypto.createHash('sha256').update(normalizedValue).digest('hex');
}

/**
 * Normalizes a real user email for Meta CAPI (`em`).
 * Returns undefined for empty, invalid, or synthetic guest phone-placeholder emails.
 */
export function normalizeEmailForMeta(rawEmail?: string | null): string | undefined {
  if (!rawEmail) return undefined;
  const cleaned = String(rawEmail).trim().toLowerCase();
  if (!cleaned || isSyntheticPhoneEmail(cleaned)) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleaned)) return undefined;
  return cleaned;
}

/**
 * Normalizes Bangladeshi (and international) phone numbers into Meta CAPI's
 * required E.164 digits-only format WITHOUT leading `+` or leading `0`.
 * Examples:
 * - "01812345678" -> "8801812345678"
 * - "+880 1812-345678" -> "8801812345678"
 * - "008801812345678" -> "8801812345678"
 * - "1812345678" -> "8801812345678"
 */
export function normalizeBdPhoneForMeta(rawPhone?: string | null): string | undefined {
  if (!rawPhone) return undefined;
  let digits = String(rawPhone).replace(/[^0-9]/g, '');
  if (!digits) return undefined;

  if (digits.startsWith('00880') && digits.length === 15) {
    digits = digits.slice(2); // -> 8801XXXXXXXXX
  } else if (digits.startsWith('88001') && digits.length === 14) {
    digits = `880${digits.slice(4)}`; // handle accidental +880 01...
  } else if (digits.startsWith('8801') && digits.length === 13) {
    // already 8801XXXXXXXXX
  } else if (digits.startsWith('01') && digits.length === 11) {
    digits = `880${digits.slice(1)}`; // 01XXXXXXXXX -> 8801XXXXXXXXX
  } else if (/^1[3-9]\d{8}$/.test(digits)) {
    digits = `880${digits}`; // 1XXXXXXXXX -> 8801XXXXXXXXX
  } else {
    // Non-BD international number: strip leading international prefix 00 or leading 0s
    digits = digits.replace(/^0+/, '');
    if (digits.length < 8 || digits.length > 15) return undefined;
  }

  return digits;
}

const PLACEHOLDER_NAMES = new Set([
  'user',
  'customer',
  'guest',
  'admin',
  'unknown',
  'bangla ai user',
]);

/**
 * Extracts normalized first (`fn`) and last (`ln`) names per Meta CAPI spec:
 * lowercase, trimmed, punctuation/digits removed.
 * Skips auto-generated placeholder names such as "User 5678" or phone-like labels.
 */
export function extractNamePartsForMeta(rawName?: string | null): { fn?: string; ln?: string } {
  if (!rawName) return {};
  const trimmed = String(rawName).trim();
  if (!trimmed) return {};

  const lower = trimmed.toLowerCase();
  if (PLACEHOLDER_NAMES.has(lower)) return {};
  // Skip auto-generated Express Guest display names like "User 5678" or raw phone numbers
  if (/^(user|guest|customer)\s*\d+$/i.test(trimmed)) return {};
  if (/^\+?\d[\d\s-]{5,}$/.test(trimmed)) return {};

  const tokens = lower
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}]/gu, ''))
    .filter((part) => part.length > 0);

  if (tokens.length === 0) return {};
  if (tokens.length === 1) {
    return { fn: tokens[0] };
  }
  return {
    fn: tokens[0],
    ln: tokens[tokens.length - 1],
  };
}

/**
 * Extracts the customer's real IP address from proxy headers or Express `req.ip`.
 */
export function extractClientIpFromRequest(
  headers: Record<string, string | string[] | undefined>,
  reqIp?: string | null
): string | undefined {
  const pickHeader = (name: string): string => {
    const val = headers[name] ?? headers[name.toLowerCase()];
    if (Array.isArray(val)) return String(val[0] || '');
    return typeof val === 'string' ? val : '';
  };

  const candidates = [
    pickHeader('cf-connecting-ip'),
    ...pickHeader('x-forwarded-for').split(','),
    pickHeader('x-real-ip'),
    reqIp || '',
  ];

  for (const candidate of candidates) {
    const cleaned = candidate.trim().replace(/^::ffff:/i, '');
    if (!cleaned) continue;
    if (cleaned.length > 64) continue;
    // Basic IPv4 or IPv6 check
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(cleaned) || cleaned.includes(':')) {
      return cleaned;
    }
  }
  return undefined;
}

export function sanitizeMetaCookieValue(
  rawValue?: string | null,
  expectedPrefix: 'fb.' = 'fb.'
): string | undefined {
  if (!rawValue || typeof rawValue !== 'string') return undefined;
  const cleaned = rawValue.trim();
  if (!cleaned || cleaned.length > 512) return undefined;
  if (!cleaned.startsWith(expectedPrefix)) return undefined;
  if (/[\r\n\s<>]/.test(cleaned)) return undefined;
  return cleaned;
}

export function sanitizeMetaUserAgent(rawUa?: string | null): string | undefined {
  if (!rawUa || typeof rawUa !== 'string') return undefined;
  const cleaned = rawUa.trim().slice(0, 512);
  return cleaned || undefined;
}

export function sanitizeEventSourceUrl(
  rawUrl?: string | null,
  fallback: string = DEFAULT_META_EVENT_SOURCE_URL
): string {
  if (!rawUrl || typeof rawUrl !== 'string') return fallback;
  const cleaned = rawUrl.trim();
  if (!cleaned || cleaned.length > 1024) return fallback;
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Fall back to default URL
  }
  return fallback;
}

/**
 * Builds a deterministic, collision-resistant Meta `event_id` for a Purchase event
 * so browser Pixel and server CAPI can deduplicate reliably.
 */
export function buildPurchaseEventId(payment: { id?: string; trx_id?: string }): string {
  const stableKey = (payment.id || payment.trx_id || '').trim();
  if (stableKey) {
    return `purchase_${stableKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }
  return `purchase_${Date.now()}`;
}

/**
 * Builds the Meta CAPI `user_data` payload with proper SHA-256 hashing for PII
 * and unhashed preservation for technical browser/cookie matching fields.
 */
export function buildMetaUserData(params: {
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  externalId?: string | null;
  countryCode?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
}): MetaCapiUserData {
  const userData: MetaCapiUserData = {};

  const normalizedEmail = normalizeEmailForMeta(params.email);
  if (normalizedEmail) {
    userData.em = [hashMetaValue(normalizedEmail)];
  }

  const normalizedPhone = normalizeBdPhoneForMeta(params.phone);
  if (normalizedPhone) {
    userData.ph = [hashMetaValue(normalizedPhone)];
  }

  const { fn, ln } = extractNamePartsForMeta(params.fullName);
  if (fn) {
    userData.fn = [hashMetaValue(fn)];
  }
  if (ln) {
    userData.ln = [hashMetaValue(ln)];
  }

  const country = (params.countryCode || 'bd').trim().toLowerCase();
  if (/^[a-z]{2}$/.test(country)) {
    userData.country = [hashMetaValue(country)];
  }

  const externalId = params.externalId?.trim();
  if (externalId && externalId !== 'test_user') {
    userData.external_id = [hashMetaValue(externalId)];
  }

  const clientIp = params.clientIpAddress?.trim().replace(/^::ffff:/i, '');
  if (clientIp) {
    userData.client_ip_address = clientIp;
  }

  const clientUa = sanitizeMetaUserAgent(params.clientUserAgent);
  if (clientUa) {
    userData.client_user_agent = clientUa;
  }

  const fbp = sanitizeMetaCookieValue(params.fbp);
  if (fbp) {
    userData.fbp = fbp;
  }

  const fbc = sanitizeMetaCookieValue(params.fbc);
  if (fbc) {
    userData.fbc = fbc;
  }

  return userData;
}

export function buildMetaCapiPurchasePayload(params: {
  payment: MetaCapiPaymentRecord;
  user?: MetaCapiUserRecord | null;
  testEventCode?: string;
  eventTimeSec?: number;
}): {
  eventId: string;
  matchedFields: string[];
  payload: Record<string, any>;
} {
  const { payment, user, testEventCode, eventTimeSec } = params;
  const eventId = buildPurchaseEventId(payment);
  const planId = payment.plan_id === 'yearly' ? 'yearly' : 'monthly';
  const planName =
    payment.plan_name ||
    (planId === 'yearly' ? 'Yearly Plan (৳5,999)' : 'Monthly Plan (৳699)');

  const userData = buildMetaUserData({
    email: user?.email || payment.user_email,
    phone: payment.sender_number || user?.phone,
    fullName: user?.name || payment.user_name,
    externalId: payment.user_id || user?.id,
    countryCode: 'bd',
    clientIpAddress: payment.meta_client_ip,
    clientUserAgent: payment.meta_client_user_agent,
    fbp: payment.meta_fbp,
    fbc: payment.meta_fbc,
  });

  const payload: Record<string, any> = {
    data: [
      {
        event_name: 'Purchase',
        event_time: eventTimeSec ?? Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: sanitizeEventSourceUrl(payment.meta_event_source_url),
        action_source: 'website',
        user_data: userData,
        custom_data: {
          currency: 'BDT',
          value: Number(payment.amount),
          content_name: planName,
          content_type: 'product',
          content_ids: [planId],
          num_items: 1,
          order_id: payment.trx_id,
          payment_method: payment.gateway,
        },
      },
    ],
  };

  if (testEventCode && testEventCode.trim()) {
    payload.test_event_code = testEventCode.trim();
  }

  return {
    eventId,
    matchedFields: Object.keys(userData),
    payload,
  };
}

export function buildMetaCapiAddPaymentInfoPayload(params: {
  payment: MetaCapiPaymentRecord;
  user?: MetaCapiUserRecord | null;
  eventId?: string;
  testEventCode?: string;
  eventTimeSec?: number;
}): {
  eventId: string;
  matchedFields: string[];
  payload: Record<string, any>;
} {
  const { payment, user, testEventCode, eventTimeSec } = params;
  const eventId =
    (params.eventId && params.eventId.trim()) ||
    `add_payment_info_${(payment.id || payment.trx_id || Date.now()).toString().replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const planId = payment.plan_id === 'yearly' ? 'yearly' : 'monthly';
  const planName =
    payment.plan_name ||
    (planId === 'yearly' ? 'Yearly Plan (৳5,999)' : 'Monthly Plan (৳699)');

  const userData = buildMetaUserData({
    email: user?.email || payment.user_email,
    phone: payment.sender_number || user?.phone,
    fullName: user?.name || payment.user_name,
    externalId: payment.user_id || user?.id,
    countryCode: 'bd',
    clientIpAddress: payment.meta_client_ip,
    clientUserAgent: payment.meta_client_user_agent,
    fbp: payment.meta_fbp,
    fbc: payment.meta_fbc,
  });

  const payload: Record<string, any> = {
    data: [
      {
        event_name: 'AddPaymentInfo',
        event_time: eventTimeSec ?? Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: sanitizeEventSourceUrl(payment.meta_event_source_url),
        action_source: 'website',
        user_data: userData,
        custom_data: {
          currency: 'BDT',
          value: Number(payment.amount),
          content_name: planName,
          content_type: 'product',
          content_ids: [planId],
          payment_method: payment.gateway,
        },
      },
    ],
  };

  if (testEventCode && testEventCode.trim()) {
    payload.test_event_code = testEventCode.trim();
  }

  return {
    eventId,
    matchedFields: Object.keys(userData),
    payload,
  };
}
