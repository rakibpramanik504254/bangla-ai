export type BrandIconKey =
  | 'openai'
  | 'claude'
  | 'gemini'
  | 'deepseek'
  | 'grok'
  | 'kimi'
  | 'meta'
  | 'qwen'
  | 'mistral'
  | 'perplexity'
  | 'nvidia'
  | 'cohere'
  | 'default';

export interface BrandLogoSpec {
  key: BrandIconKey;
  label: string;
  shortLabel: string;
  assetSrc?: string;
  invertDark?: boolean;
}

export const AI_BRAND_LOGOS: readonly BrandLogoSpec[] = [
  {
    key: 'openai',
    label: 'OpenAI / GPT',
    shortLabel: 'OpenAI',
    assetSrc: '/assets/aistudio/calc-openai_c4f23f92.svg',
    invertDark: true,
  },
  {
    key: 'claude',
    label: 'Claude / Anthropic',
    shortLabel: 'Claude',
    assetSrc: '/assets/aistudio/calc-claude_2a15ea2f.svg',
  },
  {
    key: 'gemini',
    label: 'Gemini / Google',
    shortLabel: 'Gemini',
    assetSrc: '/assets/aistudio/calc-gemini_221ee978.svg',
  },
  {
    key: 'deepseek',
    label: 'DeepSeek',
    shortLabel: 'DeepSeek',
    assetSrc: '/assets/aistudio/calc-deepseek_729ceac7.svg',
  },
  {
    key: 'grok',
    label: 'Grok / xAI',
    shortLabel: 'Grok',
    assetSrc: '/assets/aistudio/calc-grok_901d52d2.svg',
    invertDark: true,
  },
  {
    key: 'kimi',
    label: 'Kimi / Moonshot',
    shortLabel: 'Kimi',
    assetSrc: '/assets/aistudio/calc-moonshot_e685cc14.svg',
    invertDark: true,
  },
  {
    key: 'meta',
    label: 'Meta / Llama',
    shortLabel: 'Meta',
  },
  {
    key: 'qwen',
    label: 'Qwen / Alibaba',
    shortLabel: 'Qwen',
  },
  {
    key: 'mistral',
    label: 'Mistral',
    shortLabel: 'Mistral',
  },
  {
    key: 'perplexity',
    label: 'Perplexity',
    shortLabel: 'Perplexity',
    assetSrc: '/assets/aistudio/calc-perplexity_9920b037.svg',
  },
  {
    key: 'nvidia',
    label: 'NVIDIA',
    shortLabel: 'NVIDIA',
  },
  {
    key: 'cohere',
    label: 'Cohere',
    shortLabel: 'Cohere',
  },
  {
    key: 'default',
    label: 'Default / Sparkles',
    shortLabel: 'Default',
  },
] as const;

const VALID_BRAND_KEYS = new Set<string>(AI_BRAND_LOGOS.map((b) => b.key));

export function isValidBrandIconKey(value: unknown): value is BrandIconKey {
  return typeof value === 'string' && VALID_BRAND_KEYS.has(value.trim().toLowerCase());
}

export function normalizeBrandIconKey(value: unknown): BrandIconKey | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return VALID_BRAND_KEYS.has(trimmed) ? (trimmed as BrandIconKey) : null;
}

export function getBrandLogoSpec(key: BrandIconKey): BrandLogoSpec {
  return AI_BRAND_LOGOS.find((b) => b.key === key) || AI_BRAND_LOGOS[AI_BRAND_LOGOS.length - 1];
}

export interface ModelIdentityLike {
  id?: string;
  provider_id?: string;
  model_name?: string;
  display_name?: string;
  description_en?: string;
  openrouter_model_id?: string | null;
  custom_name?: string | null;
  default_name?: string;
  custom_icon?: string | null;
  default_icon?: string;
  custom_description?: string | null;
  default_description?: string;
}

/**
 * Infers the original provider brand icon key from immutable slug/provider metadata
 * (intentionally ignoring custom_name so renaming a model never breaks default_icon inference).
 */
export function inferDefaultBrandIcon(model?: ModelIdentityLike | null): BrandIconKey {
  if (!model) return 'default';

  const fingerprint = [
    model.id || '',
    model.provider_id || '',
    model.model_name || '',
    model.openrouter_model_id || '',
    model.default_name || '',
  ]
    .join(' ')
    .toLowerCase();

  if (fingerprint.includes('claude') || fingerprint.includes('anthropic')) return 'claude';
  if (fingerprint.includes('gemini') || fingerprint.includes('google') || fingerprint.includes('gemma')) return 'gemini';
  if (
    fingerprint.includes('gpt') ||
    fingerprint.includes('openai') ||
    /\bo[134](-|\b)/.test(fingerprint)
  ) {
    return 'openai';
  }
  if (fingerprint.includes('deepseek')) return 'deepseek';
  if (fingerprint.includes('grok') || fingerprint.includes('xai') || fingerprint.includes('x-ai')) return 'grok';
  if (fingerprint.includes('kimi') || fingerprint.includes('moonshot')) return 'kimi';
  if (fingerprint.includes('meta') || fingerprint.includes('llama')) return 'meta';
  if (fingerprint.includes('qwen') || fingerprint.includes('alibaba')) return 'qwen';
  if (fingerprint.includes('mistral') || fingerprint.includes('mixtral') || fingerprint.includes('codestral')) return 'mistral';
  if (fingerprint.includes('perplexity') || fingerprint.includes('sonar')) return 'perplexity';
  if (fingerprint.includes('nvidia') || fingerprint.includes('nemotron')) return 'nvidia';
  if (fingerprint.includes('cohere') || fingerprint.includes('command-r') || fingerprint.includes('north-mini')) return 'cohere';

  return 'default';
}

export function resolveEffectiveModelIcon(model?: ModelIdentityLike | null): BrandIconKey {
  if (!model) return 'default';
  const custom = normalizeBrandIconKey(model.custom_icon);
  if (custom) return custom;
  const def = normalizeBrandIconKey(model.default_icon);
  if (def) return def;
  return inferDefaultBrandIcon(model);
}

export function resolveEffectiveModelName(model?: ModelIdentityLike | null): string {
  if (!model) return 'Bangla AI Model';
  const custom = typeof model.custom_name === 'string' ? model.custom_name.trim() : '';
  if (custom) return custom;
  const def = typeof model.default_name === 'string' ? model.default_name.trim() : '';
  if (def) return def;
  return (model.display_name || '').trim() || 'Bangla AI Model';
}

export function resolveEffectiveModelDescription(model?: ModelIdentityLike | null): string {
  if (!model) return '';
  const custom = typeof model.custom_description === 'string' ? model.custom_description.trim() : '';
  if (custom) return custom;
  const def = typeof model.default_description === 'string' ? model.default_description.trim() : '';
  if (def) return def;
  return (model.description_en || '').trim();
}

export function isModelCustomized(model?: ModelIdentityLike | null): boolean {
  if (!model) return false;
  const defName = (model.default_name || '').trim();
  const customName = typeof model.custom_name === 'string' ? model.custom_name.trim() : '';
  const hasCustomName = Boolean(customName && (!defName || customName !== defName));

  const defDesc = (model.default_description || '').trim();
  const customDesc = typeof model.custom_description === 'string' ? model.custom_description.trim() : '';
  const hasCustomDesc = Boolean(customDesc && (!defDesc || customDesc !== defDesc));

  const defIcon = normalizeBrandIconKey(model.default_icon) || inferDefaultBrandIcon(model);
  const customIcon = normalizeBrandIconKey(model.custom_icon);
  const hasCustomIcon = Boolean(customIcon && customIcon !== defIcon);

  return hasCustomName || hasCustomDesc || hasCustomIcon;
}
