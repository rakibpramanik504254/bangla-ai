import React, { useEffect, useState } from 'react';
import {
  AvatarUserLike,
  getUserInitial,
  resolveUserAvatarUrl,
} from '../../utils/avatar.ts';

interface UserAvatarProps {
  user?: AvatarUserLike | null;
  alt?: string;
  sizeClassName?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  testId?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  alt,
  sizeClassName = 'w-8 h-8 text-xs',
  imgClassName = '',
  fallbackClassName = '',
  testId,
}) => {
  const avatarUrl = resolveUserAvatarUrl(user);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const displayName = alt || user?.name || user?.email || 'User';
  const initial = getUserInitial(user);

  if (avatarUrl && !hasError) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setHasError(true)}
        data-testid={testId}
        className={`${sizeClassName} rounded-full object-cover shrink-0 ${imgClassName}`.trim()}
      />
    );
  }

  return (
    <div
      aria-label={displayName}
      data-testid={testId ? `${testId}-fallback` : undefined}
      className={`${sizeClassName} rounded-full bg-[#1f1f1f] text-white dark:bg-[#e3e3e3] dark:text-[#131314] font-semibold flex items-center justify-center shrink-0 select-none ${fallbackClassName}`.trim()}
    >
      {initial}
    </div>
  );
};
