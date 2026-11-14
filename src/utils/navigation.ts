import { User } from '../types/index.ts';
import { formatBDT, isSubscriptionActive } from './billing.ts';

export type AppView =
  | 'home'
  | 'chat'
  | 'account'
  | 'admin'
  | 'about'
  | 'privacy'
  | 'terms'
  | 'security';

export interface NavItem {
  id: 'overview' | 'chat' | 'admin' | 'pricing' | 'faq';
  label: string;
}

export interface SubscriptionSummary {
  planLabel: string;
  planAmountLabel: string | null;
  isActive: boolean;
  statusLabel: string;
  remainingTokens: number;
  usageLimit: number;
  usedTokens: number;
  usagePercent: number;
  expiresAtLabel: string;
  gatewayLabel: string;
  trxId: string | null;
  actionLabel: string;
}

export interface PaymentStatusPresentation {
  label: 'Approved' | 'Pending' | 'Rejected';
  variant: 'approved' | 'pending' | 'rejected';
}

export function getPostLoginDestination(
  user: Pick<User, 'role'> | null | undefined
): 'admin' | 'chat' {
  return user?.role === 'admin' ? 'admin' : 'chat';
}

export function getDesktopNavItems(
  user: Pick<User, 'role'> | null | undefined
): NavItem[] {
  if (!user) {
    return [
      { id: 'overview', label: 'Overview' },
      { id: 'pricing', label: 'Pricing' },
      { id: 'faq', label: 'FAQ' },
    ];
  }

  const items: NavItem[] = [{ id: 'chat', label: 'AI Workspace' }];
  if (user.role === 'admin') {
    items.push({ id: 'admin', label: 'Admin Console' });
  }
  items.push({ id: 'pricing', label: 'Pricing' });
  items.push({ id: 'faq', label: 'FAQ' });
  return items;
}

export function getAccountRoleLabel(
  user: Pick<User, 'role' | 'isSubscribed' | 'subscription'> | null | undefined
): string {
  if (!user) return 'Guest';
  if (user.role === 'admin') return 'Owner & Admin';
  const active = Boolean(user.isSubscribed || isSubscriptionActive(user.subscription));
  return active ? 'Pro Plan' : 'Free Tier';
}

export function getSubscriptionSummary(user: User | null | undefined): SubscriptionSummary {
  if (!user) {
    return {
      planLabel: 'Free Tier',
      planAmountLabel: null,
      isActive: false,
      statusLabel: 'No Active Plan',
      remainingTokens: 0,
      usageLimit: 0,
      usedTokens: 0,
      usagePercent: 0,
      expiresAtLabel: '—',
      gatewayLabel: '—',
      trxId: null,
      actionLabel: 'Upgrade Plan',
    };
  }

  const sub = user.subscription;
  const active = Boolean(
    user.role === 'admin' || user.isSubscribed || isSubscriptionActive(sub)
  );
  const usageLimit = Math.max(0, user.usage_limit || 0);
  const usedTokens = Math.max(0, user.current_usage || 0);
  const remainingTokens = Math.max(0, usageLimit - usedTokens);
  const usagePercent =
    usageLimit > 0 ? Math.min(100, Math.round((usedTokens / usageLimit) * 100)) : 0;

  let planLabel = 'Free Tier';
  let planAmountLabel: string | null = null;

  if (sub?.plan_name) {
    planLabel = sub.plan_name;
    if (typeof sub.amount === 'number' && sub.amount > 0) {
      planAmountLabel = formatBDT(sub.amount);
    }
  } else if (user.role === 'admin') {
    planLabel = 'Admin Access';
  } else if (active) {
    planLabel = 'Pro Plan';
  }

  const expiresAtLabel = sub?.expires_at
    ? new Date(sub.expires_at).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return {
    planLabel,
    planAmountLabel,
    isActive: active,
    statusLabel: active ? 'Active' : 'Free Tier',
    remainingTokens,
    usageLimit,
    usedTokens,
    usagePercent,
    expiresAtLabel,
    gatewayLabel: sub?.payment_method ? sub.payment_method.toUpperCase() : '—',
    trxId: sub?.trx_id || null,
    actionLabel: active ? 'Upgrade / Renew Plan' : 'Upgrade Plan',
  };
}

export function normalizePaymentStatus(
  status?: string | null
): PaymentStatusPresentation {
  const s = (status || '').toLowerCase().trim();
  if (s === 'pending') {
    return { label: 'Pending', variant: 'pending' };
  }
  if (s === 'rejected' || s === 'failed' || s === 'declined') {
    return { label: 'Rejected', variant: 'rejected' };
  }
  return { label: 'Approved', variant: 'approved' };
}
