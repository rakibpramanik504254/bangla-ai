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
      { text: '.' },
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

export type MfsGatewayId = 'bkash' | 'nagad' | 'rocket';

export interface MfsAvailabilitySettings {
  bkash_enabled?: boolean;
  nagad_enabled?: boolean;
  rocket_enabled?: boolean;
}

const MFS_GATEWAY_LABELS: Record<MfsGatewayId, string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
};

export function resolveEnabledMfsGateways(settings?: MfsAvailabilitySettings | null): MfsGatewayId[] {
  const enabled: MfsGatewayId[] = [];
  if (settings?.bkash_enabled !== false) enabled.push('bkash');
  if (settings?.nagad_enabled !== false) enabled.push('nagad');
  if (settings?.rocket_enabled !== false) enabled.push('rocket');
  return enabled;
}

export function resolveActiveMfsGateway(
  enabledGateways: MfsGatewayId[],
  preferredGateway?: MfsGatewayId
): MfsGatewayId {
  if (preferredGateway && enabledGateways.includes(preferredGateway)) {
    return preferredGateway;
  }
  return enabledGateways[0] || 'nagad';
}

export function isMfsGatewayEnabled(
  gateway: MfsGatewayId,
  settings?: MfsAvailabilitySettings | null
): boolean {
  return resolveEnabledMfsGateways(settings).includes(gateway);
}

export function formatDisabledMfsGatewayMessage(
  gateway: MfsGatewayId,
  settings?: MfsAvailabilitySettings | null
): string {
  const gatewayLabel = MFS_GATEWAY_LABELS[gateway] || gateway;
  const enabledNames = resolveEnabledMfsGateways(settings).map(id => MFS_GATEWAY_LABELS[id]);
  if (enabledNames.length === 0) {
    return `${gatewayLabel} is temporarily unavailable. Please try again later or contact support.`;
  }
  const alternatives =
    enabledNames.length === 1
      ? enabledNames[0]
      : `${enabledNames.slice(0, -1).join(', ')} or ${enabledNames[enabledNames.length - 1]}`;
  return `${gatewayLabel} is temporarily unavailable. Please select ${alternatives} instead.`;
}




