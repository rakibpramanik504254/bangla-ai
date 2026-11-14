export interface CuratedFoundationModel {
  id: string;
  name: string;
  provider: string;
  iconSrc: string;
  iconAlt: string;
  invertDark?: boolean;
}

export const CURATED_FOUNDATION_MODELS: readonly CuratedFoundationModel[] = [
  {
    id: 'claude-fable-5-2',
    name: 'Claude Fable 5.2 (max)',
    provider: 'Anthropic',
    iconSrc: '/assets/aistudio/calc-claude_2a15ea2f.svg',
    iconAlt: 'Anthropic Claude logo',
  },
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon (high)',
    provider: 'Google',
    iconSrc: '/assets/aistudio/calc-gemini_221ee978.svg',
    iconAlt: 'Google Gemini logo',
  },
  {
    id: 'gpt-6-astra',
    name: 'GPT-6 Astra (max)',
    provider: 'OpenAI',
    iconSrc: '/assets/aistudio/calc-openai_c4f23f92.svg',
    iconAlt: 'OpenAI logo',
    invertDark: true,
  },
  {
    id: 'grok-4-7',
    name: 'Grok 4.7 (xhigh)',
    provider: 'xAI',
    iconSrc: '/assets/aistudio/calc-grok_901d52d2.svg',
    iconAlt: 'xAI Grok logo',
    invertDark: true,
  },
  {
    id: 'deepseek-v4-1-flash',
    name: 'DeepSeek V4.1 Flash',
    provider: 'DeepSeek',
    iconSrc: '/assets/aistudio/calc-deepseek_729ceac7.svg',
    iconAlt: 'DeepSeek logo',
  },
  {
    id: 'kimi-k3-1-pro',
    name: 'Kimi K3.1 Pro',
    provider: 'Moonshot AI',
    iconSrc: '/assets/aistudio/calc-moonshot_e685cc14.svg',
    iconAlt: 'Moonshot Kimi logo',
    invertDark: true,
  },
  {
    id: 'gemini-2-5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    iconSrc: '/assets/aistudio/calc-gemini_221ee978.svg',
    iconAlt: 'Google Gemini logo',
  },
  {
    id: 'gemini-2-5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    iconSrc: '/assets/aistudio/calc-gemini_221ee978.svg',
    iconAlt: 'Google Gemini logo',
  },
  {
    id: 'openai-gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'OpenAI',
    iconSrc: '/assets/aistudio/calc-openai_c4f23f92.svg',
    iconAlt: 'OpenAI logo',
    invertDark: true,
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    iconSrc: '/assets/aistudio/calc-claude_2a15ea2f.svg',
    iconAlt: 'Anthropic Claude logo',
  },
] as const;

export const CURATED_MODEL_MAP: Record<string, CuratedFoundationModel> = Object.fromEntries(
  CURATED_FOUNDATION_MODELS.map((model) => [model.id, model])
);

export type MarqueeDirection = 'right' | 'left';

export interface MarqueeRowConfig {
  id: string;
  direction: MarqueeDirection;
  durationSeconds: number;
  halfTrackItems: CuratedFoundationModel[];
}

const ROW_MODEL_INDEX_GROUPS: readonly (readonly number[])[] = [
  // Row 1 (moves RIGHT): Anthropic, xAI, Google, DeepSeek + Moonshot mix (no adjacent provider repeats)
  [0, 3, 6, 4, 9, 2],
  // Row 2 (moves LEFT): Google, OpenAI, Moonshot, Anthropic, Google
  [1, 8, 5, 0, 7, 3],
  // Row 3 (moves RIGHT): OpenAI, DeepSeek, Google, Anthropic, Moonshot, OpenAI
  [2, 4, 7, 9, 5, 1],
];

const ROW_DIRECTIONS: readonly MarqueeDirection[] = ['right', 'left', 'right'];
const ROW_DURATIONS_SECONDS: readonly number[] = [38, 42, 40];

/**
 * Builds 3 balanced, seamless marquee rows derived directly from CURATED_FOUNDATION_MODELS.
 * Each half-track repeats its staggered model group twice (12 pills per half-track) so even
 * ultrawide viewports never expose empty gaps when looping 0% <-> -50%.
 */
export function buildMarqueeRows(
  models: readonly CuratedFoundationModel[] = CURATED_FOUNDATION_MODELS
): MarqueeRowConfig[] {
  return ROW_MODEL_INDEX_GROUPS.map((indices, rowIdx) => {
    const baseSlice = indices
      .map((idx) => models[idx])
      .filter((item): item is CuratedFoundationModel => Boolean(item));

    const halfTrackItems = [...baseSlice, ...baseSlice];

    return {
      id: `marquee-row-${rowIdx + 1}`,
      direction: ROW_DIRECTIONS[rowIdx],
      durationSeconds: ROW_DURATIONS_SECONDS[rowIdx],
      halfTrackItems,
    };
  });
}
