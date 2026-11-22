import { Payment, User } from '../types/index.ts';
import { isSyntheticPhoneEmail } from './expressCheckout.ts';
import { normalizePaymentStatus } from './navigation.ts';

export type AccountSectionId =
  | 'overview'
  | 'subscription'
  | 'billing'
  | 'api_keys'
  | 'security'
  | 'preferences';

export type AccountPaymentFilter = 'all' | 'approved' | 'pending' | 'rejected';

export interface AccountNavItem {
  id: AccountSectionId;
  label: string;
  shortLabel: string;
  description: string;
  groupId: string;
  groupLabel: string;
}

export interface AccountNavGroup {
  id: string;
  label: string;
  items: AccountNavItem[];
}

export const ACCOUNT_NAV_GROUPS: AccountNavGroup[] = [
  {
    id: 'portal',
    label: 'Account Portal',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        shortLabel: 'Overview',
        description: 'Plan summary, remaining token quota, security status, and recent orders.',
        groupId: 'portal',
        groupLabel: 'Account Portal',
      },
      {
        id: 'subscription',
        label: 'Subscription & Quota',
        shortLabel: 'Plan & Quota',
        description: 'Manage your Bangla AI subscription cycle, token limit, and plan upgrades.',
        groupId: 'portal',
        groupLabel: 'Account Portal',
      },
      {
        id: 'billing',
        label: 'Billing History',
        shortLabel: 'Billing',
        description: 'Track bKash, Nagad, and Rocket TrxID orders and approval status.',
        groupId: 'portal',
        groupLabel: 'Account Portal',
      },
      {
        id: 'api_keys',
        label: 'API Keys',
        shortLabel: 'API Keys',
        description: 'Generate sk-banglaai keys, track credits & daily limits, and copy the OpenAI-compatible Base URL.',
        groupId: 'portal',
        groupLabel: 'Account Portal',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings & Access',
    items: [
      {
        id: 'security',
        label: 'Account & Security',
        shortLabel: 'Security',
        description: 'Configure your recovery email, login password, and 1-click Google sign-in.',
        groupId: 'settings',
        groupLabel: 'Settings & Access',
      },
      {
        id: 'preferences',
        label: 'Appearance & Links',
        shortLabel: 'Appearance',
        description: 'Switch between Light and Dark theme and jump across workspace tools.',
        groupId: 'settings',
        groupLabel: 'Settings & Access',
      },
    ],
  },
];

export const ALL_ACCOUNT_NAV_ITEMS: AccountNavItem[] = ACCOUNT_NAV_GROUPS.flatMap(
  (group) => group.items
);

export function getAccountNavItem(sectionId: AccountSectionId): AccountNavItem {
  return ALL_ACCOUNT_NAV_ITEMS.find((item) => item.id === sectionId) || ALL_ACCOUNT_NAV_ITEMS[0];
}

export interface AccountSecurityChecklist {
  needsEmail: boolean;
  hasPassword: boolean;
  googleLinked: boolean;
  missingCount: number;
  isComplete: boolean;
  statusLabel: string;
}

export function getAccountSecurityChecklist(
  user: Pick<User, 'email' | 'needs_email' | 'has_password' | 'google_linked' | 'firebase_uid'> | null | undefined
): AccountSecurityChecklist {
  if (!user) {
    return {
      needsEmail: true,
      hasPassword: false,
      googleLinked: false,
      missingCount: 3,
      isComplete: false,
      statusLabel: 'Setup Needed',
    };
  }
  const needsEmail = Boolean(user.needs_email || isSyntheticPhoneEmail(user.email));
  const hasPassword = user.has_password !== false;
  const googleLinked = Boolean(user.google_linked || user.firebase_uid);
  const missingCount = (needsEmail ? 1 : 0) + (!hasPassword ? 1 : 0) + (!googleLinked ? 1 : 0);
  const isComplete = missingCount === 0;

  return {
    needsEmail,
    hasPassword,
    googleLinked,
    missingCount,
    isComplete,
    statusLabel: isComplete ? 'Fully Secured' : `${missingCount} step${missingCount > 1 ? 's' : ''} left`,
  };
}

export interface AccountBillingCounts {
  all: number;
  approved: number;
  pending: number;
  rejected: number;
}

export function computeAccountBillingCounts(payments: Payment[]): AccountBillingCounts {
  return payments.reduce<AccountBillingCounts>(
    (acc, payment) => {
      acc.all += 1;
      const badge = normalizePaymentStatus(payment.status);
      acc[badge.variant] += 1;
      return acc;
    },
    { all: 0, approved: 0, pending: 0, rejected: 0 }
  );
}

export function filterAccountPayments(
  payments: Payment[],
  filter: AccountPaymentFilter,
  query: string
): Payment[] {
  const q = query.trim().toLowerCase();
  return payments.filter((payment) => {
    if (filter !== 'all') {
      const badge = normalizePaymentStatus(payment.status);
      if (badge.variant !== filter) return false;
    }
    if (!q) return true;
    return (
      (payment.trx_id || '').toLowerCase().includes(q) ||
      (payment.gateway || '').toLowerCase().includes(q) ||
      (payment.plan_name || '').toLowerCase().includes(q) ||
      String(payment.amount || '').includes(q)
    );
  });
}
