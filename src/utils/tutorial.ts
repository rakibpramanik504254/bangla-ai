import { User } from '../types/index.ts';
import { isSubscriptionActive } from './billing.ts';

export const TUTORIAL_EMBED_URL =
  'https://www.youtube.com/embed/4vOQlywNRCA?autoplay=1&controls=0&fs=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&disablekb=1';

export type TutorialTargetUser = Pick<User, 'role' | 'isSubscribed' | 'subscription'> | null | undefined;

export function hasUserActiveSubscription(user: TutorialTargetUser): boolean {
  if (!user) return false;
  if (user.isSubscribed) return true;
  if (user.role === 'admin') return true;
  return isSubscriptionActive(user.subscription);
}

export function shouldShowTutorialCta(params: {
  user?: TutorialTargetUser;
  loading?: boolean;
  hasStoredToken?: boolean;
}): boolean {
  const { user, loading = false, hasStoredToken = false } = params;
  // Avoid flashing non-subscriber CTAs while an existing session token is still loading
  if (loading && hasStoredToken && !user) {
    return false;
  }
  return !hasUserActiveSubscription(user);
}
