export type FoundationModelIconKey =
  | 'code'
  | 'sparkles'
  | 'cpu'
  | 'zap'
  | 'layers'
  | 'book';

export interface CuratedFoundationModel {
  id: string;
  name: string;
  category: string;
  iconKey: FoundationModelIconKey;
}

export const CURATED_FOUNDATION_MODELS: readonly CuratedFoundationModel[] = [
  {
    id: 'claude-fable-5-2',
    name: 'Claude Fable 5.2 (max)',
    category: 'Coding & Prose',
    iconKey: 'code',
  },
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon (high)',
    category: 'Multimodal 2M',
    iconKey: 'sparkles',
  },
  {
    id: 'gpt-6-astra',
    name: 'GPT-6 Astra (max)',
    category: 'General Reasoning',
    iconKey: 'cpu',
  },
  {
    id: 'grok-4-7',
    name: 'Grok 4.7 (xhigh)',
    category: 'Real-Time Inference',
    iconKey: 'zap',
  },
  {
    id: 'deepseek-v4-1-flash',
    name: 'DeepSeek V4.1 Flash',
    category: 'Math & Logic',
    iconKey: 'layers',
  },
  {
    id: 'kimi-k3-1-pro',
    name: 'Kimi K3.1 Pro',
    category: 'Document Synthesis',
    iconKey: 'book',
  },
  {
    id: 'gemini-2-5-flash',
    name: 'Gemini 2.5 Flash',
    category: 'Fast Multimodal',
    iconKey: 'sparkles',
  },
  {
    id: 'gemini-2-5-pro',
    name: 'Gemini 2.5 Pro',
    category: 'Advanced Analysis',
    iconKey: 'sparkles',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    category: 'Conversational AI',
    iconKey: 'cpu',
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    category: 'Software Engineering',
    iconKey: 'code',
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
  // Row 1 (moves RIGHT)
  [0, 3, 6, 4, 9, 2],
  // Row 2 (moves LEFT)
  [1, 8, 5, 0, 7, 3],
  // Row 3 (moves RIGHT)
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
