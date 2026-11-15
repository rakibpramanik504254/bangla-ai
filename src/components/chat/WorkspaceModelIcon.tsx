import React from 'react';
import { type ModelIdentityLike, resolveEffectiveModelIcon } from '../../utils/modelBrandIcons.ts';
import { BrandLogoIcon } from './BrandLogoIcon.tsx';

interface WorkspaceModelIconProps {
  model?: ModelIdentityLike | null;
  sizeClass?: string;
}

export const WorkspaceModelIcon: React.FC<WorkspaceModelIconProps> = ({
  model,
  sizeClass = 'w-4 h-4',
}) => {
  const effectiveKey = resolveEffectiveModelIcon(model);
  return <BrandLogoIcon iconKey={effectiveKey} sizeClass={sizeClass} />;
};
