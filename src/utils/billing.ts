/**
 * Pure billing, currency formatting, and subscription calculation utilities for Bangla AI
 */

export interface PlanConfig {
  id: 'monthly' | 'yearly';
  name: string;
  priceBDT: number;
  durationDays: number;
  monthlyEquivalentBDT?: number;
  savePercent?: number;
  features: string[];
}

export const PLANS: Record<'monthly' | 'yearly', PlanConfig> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly Plan',
    priceBDT: 699,
    durationDays: 30,
    features: [
      'Full access to top AI models (Claude Fable 5.2 (max), Gemini 4 Carbon (high), GPT-6 Astra (max), Grok 4.7 (xhigh))',
      'High-speed streaming responses with priority queuing',
      '1,000,000 (1M) token quota per monthly billing cycle',
      'Persistent chat history & session management',
      'Instant local payment via bKash, Nagad & Rocket',
      '24/7 technical customer support'
    ]
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly Plan',
    priceBDT: 5999,
    durationDays: 365,
    monthlyEquivalentBDT: 500,
    savePercent: 28,
    features: [
      'Everything in Monthly Plan included',
      'Save 28% annually (only ৳500/month equivalent)',
      '15,000,000 (15M) token quota per annual billing cycle',
      'Early access to newly released foundation models',
      'Dedicated high-throughput VIP server allocation',
      'Priority concierge & enterprise-grade support'
    ]
  }
};

/**
 * Formats an amount in Bangladeshi Taka with standard commas (e.g., "৳699")
 */
export function formatBDT(amount: number): string {
  const parts = amount.toLocaleString('en-US').split('.');
  if (parts.length > 1) {
    return `৳${parts[0]}.${parts[1]}`;
  }
  return `৳${parts[0]}`;
}

/**
 * Checks if a subscription is currently active based on status and expiry date
 */
export function isSubscriptionActive(subscription?: {
  status?: string;
  expires_at?: string | number | Date;
} | null): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;
  if (!subscription.expires_at) return false;

  const expiryTime = new Date(subscription.expires_at).getTime();
  const now = Date.now();
  return expiryTime > now;
}

/**
 * Calculates new expiration date when activating or renewing a plan
 */
export function calculateExpiryDate(
  planId: 'monthly' | 'yearly',
  currentExpiresAt?: string | number | Date | null
): Date {
  const days = PLANS[planId]?.durationDays || 30;
  const msToAdd = days * 24 * 60 * 60 * 1000;

  let baseTime = Date.now();
  if (currentExpiresAt) {
    const currentExpiry = new Date(currentExpiresAt).getTime();
    if (currentExpiry > baseTime) {
      baseTime = currentExpiry;
    }
  }

  return new Date(baseTime + msToAdd);
}

/**
 * Calculates remaining usage stats and percentage
 */
export function calculateUsageStats(limit: number, currentUsage: number) {
  const safeLimit = Math.max(0, limit);
  const safeUsage = Math.max(0, currentUsage);
  const remaining = Math.max(0, safeLimit - safeUsage);
  const percentage = safeLimit > 0 ? Math.min(100, Math.round((safeUsage / safeLimit) * 100)) : 0;
  const isLimitReached = safeLimit === 0 || safeUsage >= safeLimit;

  return {
    limit: safeLimit,
    used: safeUsage,
    remaining,
    percentage,
    isLimitReached
  };
}

/**
 * Estimates token count for combined prompt and response
 */
export function estimateTokens(prompt: string, completion: string = ''): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  const countText = (str: string) => {
    if (!str) return 0;
    // Average 1 token ≈ 4 characters in English
    return Math.max(1, Math.ceil(str.length / 4));
  };

  const promptTokens = countText(prompt);
  const completionTokens = countText(completion);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens
  };
}
