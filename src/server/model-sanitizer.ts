import { AiModel } from '../db/database.ts';

const CAPABILITY_BADGES = new Set<AiModel['badge']>([
  'super_fast',
  'reasoning',
  'coding',
  'balanced',
  'max',
  'high',
  'xhigh'
]);

/**
 * Infers a neutral capability badge for Workspace display so customers cannot
 * distinguish free-tier upstream models from paid flagship models.
 */
export function resolveWorkspaceBadge(model: Pick<AiModel, 'badge' | 'model_name' | 'display_name'>): Exclude<AiModel['badge'], 'free'> {
  if (model.badge !== 'free' && CAPABILITY_BADGES.has(model.badge)) {
    return model.badge as Exclude<AiModel['badge'], 'free'>;
  }

  const combined = `${model.model_name} ${model.display_name}`.toLowerCase();
  if (combined.includes('code') || combined.includes('coder')) {
    return 'coding';
  }
  if (combined.includes('reasoning') || combined.includes('r1') || combined.includes('think')) {
    return 'reasoning';
  }
  if (
    combined.includes('flash') ||
    combined.includes('lightning') ||
    combined.includes('mini') ||
    combined.includes('nano') ||
    combined.includes('small') ||
    combined.includes('1.7b')
  ) {
    return 'super_fast';
  }
  if (combined.includes('ultra') || combined.includes('550b') || combined.includes('super')) {
    return 'high';
  }
  return 'balanced';
}

/**
 * Removes "(Free)", "[Free]", "Free", and OpenRouter free-router labels from a model's customer-facing name.
 */
export function sanitizeWorkspaceModelName(displayName: string): string {
  if (!displayName) return 'Bangla AI Model';

  let clean = displayName
    .replace(/\bopenrouter\s+free\s+router\b/gi, 'Bangla AI Smart Router')
    .replace(/\(\s*free(?:\s+tier)?\s*\)/gi, '')
    .replace(/\[\s*free(?:\s+tier)?\s*\]/gi, '')
    .replace(/\s*[-–—|:]\s*free(?:\s+tier)?\b/gi, '')
    .replace(/\bfree\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([),\]])/g, '$1')
    .replace(/^\s*[-–—|:]\s*|\s*[-–—|:]\s*$/g, '')
    .trim();

  return clean || 'Bangla AI Model';
}

/**
 * Removes pricing/free-tier phrasing from model descriptions shown in Workspace.
 */
export function sanitizeWorkspaceDescription(description: string): string {
  if (!description) {
    return 'High-efficiency foundation model ready in Bangla AI Workspace.';
  }

  let clean = description
    .replace(/\bvia\s+openrouter\s+free\s+tier\b/gi, '')
    .replace(/\bon\s+openrouter\s+free\s+tier\b/gi, '')
    .replace(/\bvia\s+openrouter\s+free\s+collection\b/gi, '')
    .replace(/\bon\s+openrouter\s+free\s+collection\b/gi, '')
    .replace(/\bhosted\s+free\s+on\s+openrouter\b/gi, 'optimized for fast cloud inference')
    .replace(/\bat\s+zero\s+cost\b/gi, '')
    .replace(/\bzero[-\s]?cost\b/gi, 'Adaptive')
    .replace(/\bfree\s+openrouter\s+model\b/gi, 'Bangla AI foundation model')
    .replace(/\bfree\s+tier\b/gi, '')
    .replace(/\bopenrouter\s+free\b/gi, 'cloud')
    .replace(/\ban\s+available\s+free\b/gi, 'an optimal')
    .replace(/\bfree\s+model\b/gi, 'foundation model')
    .replace(/\bfree\b/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([.,;!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Fix lowercase start if a leading word was stripped
  if (clean && /^[a-z]/.test(clean)) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // Strip stray trailing connectors left behind before punctuation (e.g. "with 1M context .")
  clean = clean.replace(/\s+(on|via|for|at|with)\s*([.,;!?]|$)/gi, '$2').trim();

  return clean || 'High-efficiency foundation model ready in Bangla AI Workspace.';
}

/**
 * Returns a Workspace-safe view of an AiModel with all free/paid pricing hints removed.
 * Admin endpoints (`/api/admin/models`) continue returning the unsanitized `AiModel` records.
 */
export function sanitizeModelForWorkspace(model: AiModel): AiModel {
  const cleanName = sanitizeWorkspaceModelName(model.display_name);
  const cleanDescription = sanitizeWorkspaceDescription(model.description_en);
  const cleanBadge = resolveWorkspaceBadge(model);
  const cleanModelSlug =
    model.model_name === 'openrouter/free'
      ? 'bangla-ai/smart-router'
      : model.model_name.replace(/:free$/i, '');

  const { is_free: _ignoredIsFree, openrouter_model_id: _ignoredOrId, ...rest } = model;

  return {
    ...rest,
    model_name: cleanModelSlug,
    display_name: cleanName,
    description_en: cleanDescription,
    badge: cleanBadge
  };
}
