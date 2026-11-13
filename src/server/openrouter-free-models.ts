import { AiModel } from '../db/database.ts';

export interface FreeModelSeedSpec {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  badge: AiModel['badge'];
  contextWindow: number;
  maxOutputTokens: number;
  sortOrder: number;
}

/**
 * Curated free models from https://openrouter.ai/collections/free-models
 * Seeded with `is_enabled: false` so admins can toggle them ON/OFF from the backend Console.
 */
export const OPENROUTER_FREE_MODELS_CATALOG: FreeModelSeedSpec[] = [
  {
    id: 'mod_or_free_router',
    slug: 'openrouter/free',
    displayName: 'OpenRouter Free Router (Auto)',
    description: 'Zero-cost smart router that automatically selects an available free OpenRouter model for each request.',
    badge: 'free',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    sortOrder: 101
  },
  {
    id: 'mod_or_free_gemma_4_31b',
    slug: 'google/gemma-4-31b-it:free',
    displayName: 'Google Gemma 4 31B (Free)',
    description: 'Google open-weight 31B Gemma 4 instruction model via OpenRouter free tier. Strong reasoning and multilingual fluency.',
    badge: 'free',
    contextWindow: 262144,
    maxOutputTokens: 32768,
    sortOrder: 102
  },
  {
    id: 'mod_or_free_gemma_4_26b',
    slug: 'google/gemma-4-26b-a4b-it:free',
    displayName: 'Google Gemma 4 26B A4B (Free)',
    description: 'Fast MoE Gemma 4 26B (4B active) variant on OpenRouter free tier for snappy everyday chat and drafting.',
    badge: 'free',
    contextWindow: 262144,
    maxOutputTokens: 32768,
    sortOrder: 103
  },
  {
    id: 'mod_or_free_nemotron_3_ultra',
    slug: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    displayName: 'NVIDIA Nemotron 3 Ultra 550B (Free)',
    description: 'Flagship 550B MoE open model with 1M context window for deep analysis and complex problem solving.',
    badge: 'free',
    contextWindow: 1000000,
    maxOutputTokens: 65536,
    sortOrder: 104
  },
  {
    id: 'mod_or_free_nemotron_3_5_super_vl',
    slug: 'nvidia/nemotron-3.5-super-vl:free',
    displayName: 'NVIDIA Nemotron 3.5 Super VL (Free)',
    description: 'High-capacity NVIDIA Nemotron 3.5 Super model with 1M context and long-output synthesis at zero cost.',
    badge: 'free',
    contextWindow: 1000000,
    maxOutputTokens: 65536,
    sortOrder: 105
  },
  {
    id: 'mod_or_free_nemotron_3_5_lightning',
    slug: 'nvidia/nemotron-3.5-lightning:free',
    displayName: 'NVIDIA Nemotron 3.5 Lightning (Free)',
    description: 'Low-latency, high-throughput NVIDIA Nemotron Lightning model with 1M token context on OpenRouter free tier.',
    badge: 'free',
    contextWindow: 1000000,
    maxOutputTokens: 65536,
    sortOrder: 106
  },
  {
    id: 'mod_or_free_nemotron_3_nano_reasoning',
    slug: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    displayName: 'NVIDIA Nemotron 3 Nano Reasoning (Free)',
    description: 'Compact 30B-A3B reasoning-tuned model optimized for step-by-step logic and structured answers.',
    badge: 'free',
    contextWindow: 256000,
    maxOutputTokens: 65536,
    sortOrder: 107
  },
  {
    id: 'mod_or_free_cohere_north_code',
    slug: 'cohere/north-mini-code:free',
    displayName: 'Cohere North Mini Code (Free)',
    description: 'Coding-focused free OpenRouter model for TypeScript, Python, debugging, and quick code generation.',
    badge: 'free',
    contextWindow: 256000,
    maxOutputTokens: 64000,
    sortOrder: 108
  },
  {
    id: 'mod_or_free_ernie_5_5_flash',
    slug: 'baidu/ernie-5.5-flash-preview:free',
    displayName: 'Baidu ERNIE 5.5 Flash (Free)',
    description: 'Ultra-fast 1M context ERNIE 5.5 Flash preview model hosted free on OpenRouter.',
    badge: 'free',
    contextWindow: 1024000,
    maxOutputTokens: 65536,
    sortOrder: 109
  },
  {
    id: 'mod_or_free_inkling_2_small',
    slug: 'thinkingmachines/inkling-2-small:free',
    displayName: 'Thinking Machines Inkling 2 Small (Free)',
    description: 'Lightweight 1M-context conversational model from Thinking Machines on OpenRouter free tier.',
    badge: 'free',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    sortOrder: 110
  },
  {
    id: 'mod_or_free_particle_1',
    slug: 'particle-ai/particle-1:free',
    displayName: 'Particle AI Particle-1 (Free)',
    description: '1M context general-purpose model via OpenRouter free collection.',
    badge: 'free',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    sortOrder: 111
  },
  {
    id: 'mod_or_free_flint_v1',
    slug: 'recursive/flint-v1.0:free',
    displayName: 'Recursive Flint v1.0 (Free)',
    description: 'Recursive Labs Flint v1.0 open model with 262k context window on OpenRouter free tier.',
    badge: 'free',
    contextWindow: 262144,
    maxOutputTokens: 65536,
    sortOrder: 112
  },
  {
    id: 'mod_or_free_dots_3_note',
    slug: 'dots-studio/dots-3-note-preview:free',
    displayName: 'Dots3 Note Preview (Free)',
    description: 'Structured note-taking and summarization model with 512k context on OpenRouter free tier.',
    badge: 'free',
    contextWindow: 512000,
    maxOutputTokens: 65536,
    sortOrder: 113
  },
  {
    id: 'mod_or_free_lfm_3_1_7b',
    slug: 'liquid/lfm-3-1.7b:free',
    displayName: 'LiquidAI LFM3 1.7B (Free)',
    description: 'Ultra-compact Liquid Foundation Model (1.7B) with 262k context for instantaneous lightweight tasks.',
    badge: 'free',
    contextWindow: 262144,
    maxOutputTokens: 8192,
    sortOrder: 114
  }
];

export function createSeededFreeModels(now: string): AiModel[] {
  return OPENROUTER_FREE_MODELS_CATALOG.map(spec => ({
    id: spec.id,
    provider_id: 'prov_openrouter',
    model_name: spec.slug,
    display_name: spec.displayName,
    description_en: spec.description,
    badge: spec.badge,
    is_enabled: false, // Turned OFF by default; Admin toggles ON when needed
    is_default: false,
    is_free: true,
    context_window: spec.contextWindow,
    max_output_tokens: spec.maxOutputTokens,
    sort_order: spec.sortOrder,
    openrouter_model_id: spec.slug,
    created_at: now
  }));
}

function makeModelIdFromSlug(slug: string): string {
  const normalized = slug
    .toLowerCase()
    .replace(/:free$/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `mod_or_free_${normalized}`;
}

/**
 * Converts live `/api/v1/models` entries into disabled (`is_enabled: false`) free AiModel records,
 * skipping any already registered in `existingModels` or audio-only music clip models.
 */
export function buildNewFreeModelsFromOpenRouterApi(
  apiModels: any[],
  existingModels: AiModel[],
  now: string
): AiModel[] {
  const existingSlugs = new Set<string>();
  const existingIds = new Set<string>();
  let maxSort = 100;

  for (const m of existingModels) {
    existingIds.add(m.id);
    existingSlugs.add(m.model_name);
    if (m.openrouter_model_id) existingSlugs.add(m.openrouter_model_id);
    if (m.sort_order > maxSort) maxSort = m.sort_order;
  }

  const additions: AiModel[] = [];

  for (const raw of apiModels || []) {
    const slug = typeof raw?.id === 'string' ? raw.id.trim() : '';
    if (!slug) continue;

    const isExplicitFreeSlug = slug.endsWith(':free') || slug === 'openrouter/free';
    if (!isExplicitFreeSlug) continue;

    // Skip non-text / music generation models if output modality excludes text
    const outMods: string[] = Array.isArray(raw?.architecture?.output_modalities)
      ? raw.architecture.output_modalities
      : ['text'];
    if (!outMods.includes('text')) continue;

    if (existingSlugs.has(slug)) continue;

    const generatedId = makeModelIdFromSlug(slug);
    if (existingIds.has(generatedId)) continue;

    maxSort += 1;
    const rawName = typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : slug;
    const cleanName = rawName.toLowerCase().includes('(free)') ? rawName : `${rawName} (Free)`;
    const ctx = Number(raw?.context_length) > 0 ? Number(raw.context_length) : 128000;
    const maxOut = Number(raw?.top_provider?.max_completion_tokens) > 0
      ? Math.min(Number(raw.top_provider.max_completion_tokens), 65536)
      : 8192;
    const rawDesc = typeof raw?.description === 'string' && raw.description.trim()
      ? raw.description.trim().slice(0, 180)
      : `Free OpenRouter model (${slug}) ready to toggle ON/OFF for AI Workspace.`;

    existingIds.add(generatedId);
    existingSlugs.add(slug);

    additions.push({
      id: generatedId,
      provider_id: 'prov_openrouter',
      model_name: slug,
      display_name: cleanName,
      description_en: rawDesc,
      badge: 'free',
      is_enabled: false,
      is_default: false,
      is_free: true,
      context_window: ctx,
      max_output_tokens: maxOut,
      sort_order: maxSort,
      openrouter_model_id: slug,
      created_at: now
    });
  }

  return additions;
}
