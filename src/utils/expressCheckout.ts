export function normalizeBdPhoneNumber(raw?: string | null): string {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('8801') && digits.length === 13) {
    return digits.slice(2);
  }
  if (digits.startsWith('01') && digits.length === 11) {
    return digits;
  }
  return digits;
}

export function isValidBdPhoneNumber(raw?: string | null): boolean {
  const normalized = normalizeBdPhoneNumber(raw);
  return /^01[3-9][0-9]{8}$/.test(normalized);
}

export function isValidEmailAddress(raw?: string | null): boolean {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function synthesizeGuestEmailFromPhone(rawPhone: string): string {
  const normalized = normalizeBdPhoneNumber(rawPhone);
  return `${normalized}@phone.bangla-ai.pro`;
}

export function isSyntheticPhoneEmail(email?: string | null): boolean {
  return String(email || '')
    .trim()
    .toLowerCase()
    .endsWith('@phone.bangla-ai.pro');
}

export function deriveGuestDisplayName(params: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): string {
  const cleanName = String(params.name || '').trim();
  if (cleanName) return cleanName;
  const cleanEmail = String(params.email || '').trim().toLowerCase();
  if (cleanEmail && !isSyntheticPhoneEmail(cleanEmail) && cleanEmail.includes('@')) {
    return cleanEmail.split('@')[0];
  }
  const phone = normalizeBdPhoneNumber(params.phone);
  if (phone.length >= 4) {
    return `Customer ${phone.slice(-4)}`;
  }
  return 'Bangla AI Customer';
}

export function isFacebookInAppBrowser(userAgent?: string | null): boolean {
  const ua = String(userAgent || '');
  if (!ua) return false;
  return /FBAN|FBAV|FB_IAB|FBIOS|FB4A|Instagram|Messenger/i.test(ua);
}

export function isAndroidUserAgent(userAgent?: string | null): boolean {
  return /Android/i.test(String(userAgent || ''));
}

export function buildAndroidChromeIntentUrl(currentUrl: string): string {
  try {
    const parsed = new URL(currentUrl);
    const scheme = parsed.protocol.replace(':', '') || 'https';
    const hostAndPath = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
    return `intent://${hostAndPath}#Intent;scheme=${scheme};package=com.android.chrome;end`;
  } catch {
    return currentUrl;
  }
}

export function formatUserContactSubtitle(user?: {
  email?: string | null;
  phone?: string | null;
  needs_email?: boolean;
} | null): string {
  if (!user) return '';
  const needsEmail = Boolean(user.needs_email || isSyntheticPhoneEmail(user.email));
  if (needsEmail) {
    return user.phone ? `Phone: ${user.phone}` : 'Phone Account';
  }
  return String(user.email || '').trim();
}

export interface MfsInstructionSegment {
  text: string;
  bold?: boolean;
  mono?: boolean;
}

export interface MfsPaymentGuide {
  gatewayName: string;
  ussdCode: string;
  steps: string[];
  stepSegments: MfsInstructionSegment[][];
}

export function getMfsPaymentGuide(params: {
  gateway: 'bkash' | 'nagad' | 'rocket';
  amountText: string;
  merchantNumber: string;
}): MfsPaymentGuide {
  const meta: Record<'bkash' | 'nagad' | 'rocket', { name: string; ussd: string }> = {
    bkash: { name: 'bKash', ussd: '*247#' },
    nagad: { name: 'Nagad', ussd: '*167#' },
    rocket: { name: 'Rocket', ussd: '*322#' },
  };
  const info = meta[params.gateway] || meta.bkash;

  const stepSegments: MfsInstructionSegment[][] = [
    [
      { text: `Open ${info.name} App or dial ${info.ussd} and select ` },
      { text: 'Send Money', bold: true },
      { text: ' (do not use Cash Out).' },
    ],
    [
      { text: 'Copy the number above (' },
      { text: params.merchantNumber, bold: true, mono: true },
      { text: ') and send exact ' },
      { text: params.amountText, bold: true, mono: true },
      { text: '.' },
    ],
    [
      { text: 'Enter your Sender Mobile & ' },
      { text: 'SMS TrxID', bold: true },
      { text: ' below, then submit to unlock your plan.' },
    ],
  ];

  return {
    gatewayName: info.name,
    ussdCode: info.ussd,
    steps: stepSegments.map(segs => segs.map(s => s.text).join('')),
    stepSegments,
  };
}



