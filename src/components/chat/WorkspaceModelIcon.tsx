import React from 'react';
import { Sparkles } from 'lucide-react';
import { AiModel } from '../../types/index.ts';
import { resolveWorkspaceModelVisual } from '../../utils/workspaceSidebar.ts';

interface WorkspaceModelIconProps {
  model?: Pick<AiModel, 'id' | 'model_name' | 'display_name' | 'provider_id' | 'openrouter_model_id'> | null;
  sizeClass?: string;
}

export const WorkspaceModelIcon: React.FC<WorkspaceModelIconProps> = ({
  model,
  sizeClass = 'w-4 h-4',
}) => {
  const visual = resolveWorkspaceModelVisual(model);

  if (!visual) {
    return <Sparkles className={`${sizeClass} text-[#444746] dark:text-[#9aa0a6] shrink-0`} />;
  }

  return (
    <img
      src={visual.iconSrc}
      alt={visual.iconAlt}
      className={`${sizeClass} object-contain shrink-0 select-none ${
        visual.invertDark ? 'dark:invert dark:brightness-110' : ''
      }`}
    />
  );
};
