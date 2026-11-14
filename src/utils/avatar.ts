export interface AvatarUserLike {
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
  picture?: string | null;
  avatar_url?: string | null;
  avatar?: string | null;
  user_metadata?: {
    avatar_url?: string | null;
    picture?: string | null;
    [key: string]: unknown;
  } | null;
}

function normalizeAvatarCandidate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveUserAvatarUrl(user?: AvatarUserLike | null): string | undefined {
  if (!user) return undefined;
  return (
    normalizeAvatarCandidate(user.photoURL) ||
    normalizeAvatarCandidate(user.picture) ||
    normalizeAvatarCandidate(user.avatar_url) ||
    normalizeAvatarCandidate(user.avatar) ||
    normalizeAvatarCandidate(user.user_metadata?.avatar_url) ||
    normalizeAvatarCandidate(user.user_metadata?.picture)
  );
}

export function getUserInitial(user?: AvatarUserLike | null): string {
  const source =
    normalizeAvatarCandidate(user?.name) ||
    normalizeAvatarCandidate(user?.email) ||
    'U';
  return source.slice(0, 1).toUpperCase();
}
