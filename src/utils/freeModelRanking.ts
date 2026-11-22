import type { AiModel } from '../types/index.ts';
import { isFreeAiModel } from './modelTier.ts';

export type FreeModelSortKey =
  | 'default'
  | 'most_powerful'
  | 'most_used'
  | 'highest_burn'
  | 'most_economical'
  | 'largest_context';

export interface FreeModelMetrics {
  powerScore: number; // 1 - 100
  powerLabel: 'Ultra' | 'High' | 'Balanced' | 'Light' | 'Auto';
  burnScore: number; // 1 - 100 (relative token/compute heaviness per chat)
  burnLabel: 'Heavy' | 'Medium' | 'Light';
  parameterBillions: number | null;
  tokensUsed: number;
}

const KNOWN_POWER_OVERRIDES: Array<{ pattern: RegExp; power: number; burn: number }> = [
  { pattern: /^openrouter\/free$/i, power: 76, burn: 50 },
  { pattern: /nemotron-3-ultra|550b/i, power: 97, burn: 94 },
  { pattern: /deepseek-r1(?![a-z0-9-]*distill)/i, power: 96, burn: 96 },
  { pattern: /deepseek-v3|deepseek-chat/i, power: 94, burn: 78 },
  { pattern: /nemotron-3\.5-super/i, power: 92, burn: 86 },
  { pattern: /llama-3\.1-405b|405b/i, power: 95, burn: 92 },
  { pattern: /qwen3-235b|235b/i, power: 94, burn: 88 },
  { pattern: /qwen-?2\.5-?72b|llama-3\.3-70b|llama-3\.1-70b/i, power: 88, burn: 76 },
  { pattern: /gemma-4-31b/i, power: 85, burn: 68 },
  { pattern: /nemotron-3-nano.*reasoning/i, power: 83, burn: 84 },
  { pattern: /gemma-4-26b/i, power: 79, burn: 46 },
  { pattern: /nemotron-3\.5-lightning/i, power: 80, burn: 44 },
  { pattern: /ernie-5\.5-flash/i, power: 81, burn: 42 },
  { pattern: /cohere\/north-mini-code/i, power: 78, burn: 58 },
  { pattern: /dots-3-note/i, power: 74, burn: 54 },
  { pattern: /flint-v1/i, power: 73, burn: 56 },
  { pattern: /particle-1/i, power: 72, burn: 52 },
  { pattern: /inkling-2-small/i, power: 68, burn: 38 },
  { pattern: /lfm-3-1\.7b|1\.7b/i, power: 46, burn: 18 }
];

export function extractParameterBillions(text: string): number | null {
  // Match tokens like 550b, 70b, 31b, 1.7b, 8b (avoid matching active-only tokens like a4b first)
  const matches = Array.from(text.matchAll(/(?:^|[^a-z0-9])(\d+(?:\.\d+)?)\s*b(?![a-z0-9])/gi));
  let maxVal: number | null = null;
  for (const m of matches) {
    const val = Number(m[1]);
    if (Number.isFinite(val) && val >= 0.5 && val <= 2000) {
      if (maxVal === null || val > maxVal) {
        maxVal = val;
      }
    }
  }
  return maxVal;
}

function clampScore(value: number): number {
  return Math.max(10, Math.min(99, Math.round(value)));
}

export function evaluateFreeModelMetrics(
  model: AiModel,
  modelUsageMap?: Record<string, number>
): FreeModelMetrics {
  const slug = (model.openrouter_model_id || model.model_name || '').trim();
  const combined = `${slug} ${model.default_name || model.display_name || ''} ${model.default_description || model.description_en || ''}`;
  const lower = combined.toLowerCase();
  const tokensUsed = Math.max(0, Number(modelUsageMap?.[model.id] ?? 0));
  const paramB = extractParameterBillions(combined);

  const isAutoRouter = slug.toLowerCase() === 'openrouter/free';

  // Check curated known profiles first
  let basePower: number | null = null;
  let baseBurn: number | null = null;
  for (const rule of KNOWN_POWER_OVERRIDES) {
    if (rule.pattern.test(slug) || rule.pattern.test(lower)) {
      basePower = rule.power;
      baseBurn = rule.burn;
      break;
    }
  }

  if (basePower === null || baseBurn === null) {
    // Heuristic scoring for newly synced OpenRouter :free models
    let power = 62;
    let burn = 50;

    if (paramB !== null) {
      if (paramB >= 400) {
        power = 94;
        burn = 90;
      } else if (paramB >= 100) {
        power = 90;
        burn = 82;
      } else if (paramB >= 65) {
        power = 86;
        burn = 74;
      } else if (paramB >= 24) {
        power = 80;
        burn = 62;
      } else if (paramB >= 12) {
        power = 72;
        burn = 48;
      } else if (paramB >= 6) {
        power = 64;
        burn = 36;
      } else {
        power = 50;
        burn = 22;
      }
    }

    // Reasoning / thinking models are stronger on hard tasks and consume significantly more thinking tokens
    if (/(reasoning|thinking|\br1\b|\bo3\b|\bo1\b|qwq)/i.test(lower)) {
      power += 7;
      burn += 18;
    }
    if (/(ultra|pro|super|large|max|flagship)/i.test(lower)) {
      power += 6;
      burn += 10;
    }
    if (/(code|coder|codestral)/i.test(lower)) {
      power += 3;
      burn += 6;
    }
    if (/(flash|lightning|mini|nano|small|lite|fast|haiku|instant|a3b|a4b)/i.test(lower)) {
      burn -= 14;
      if (paramB === null) power -= 2;
    }

    // Context window & output token capacity adjustments
    const ctx = Number(model.context_window) || 0;
    const maxOut = Number(model.max_output_tokens) || 0;
    if (ctx >= 900_000) {
      power += 4;
      burn += 6;
    } else if (ctx >= 250_000) {
      power += 2;
      burn += 3;
    }
    if (maxOut >= 32_000) {
      burn += 7;
    } else if (maxOut <= 8_192) {
      burn -= 5;
    }

    basePower = clampScore(power);
    baseBurn = clampScore(burn);
  }

  const powerScore = clampScore(basePower);
  const burnScore = clampScore(baseBurn);

  const powerLabel: FreeModelMetrics['powerLabel'] = isAutoRouter
    ? 'Auto'
    : powerScore >= 90
      ? 'Ultra'
      : powerScore >= 80
        ? 'High'
        : powerScore >= 65
          ? 'Balanced'
          : 'Light';

  const burnLabel: FreeModelMetrics['burnLabel'] =
    burnScore >= 72 ? 'Heavy' : burnScore >= 45 ? 'Medium' : 'Light';

  return {
    powerScore,
    powerLabel,
    burnScore,
    burnLabel,
    parameterBillions: paramB,
    tokensUsed
  };
}

export function sortFreeModels(
  models: AiModel[],
  sortKey: FreeModelSortKey,
  modelUsageMap?: Record<string, number>
): AiModel[] {
  const freeOnly = models.filter(isFreeAiModel);
  if (sortKey === 'default') {
    return [...freeOnly].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  const metricCache = new Map<string, FreeModelMetrics>();
  for (const m of freeOnly) {
    metricCache.set(m.id, evaluateFreeModelMetrics(m, modelUsageMap));
  }

  return [...freeOnly].sort((a, b) => {
    const ma = metricCache.get(a.id)!;
    const mb = metricCache.get(b.id)!;

    switch (sortKey) {
      case 'most_powerful':
        return (
          mb.powerScore - ma.powerScore ||
          (b.context_window || 0) - (a.context_window || 0) ||
          (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );
      case 'most_used':
        return (
          mb.tokensUsed - ma.tokensUsed ||
          mb.burnScore - ma.burnScore ||
          mb.powerScore - ma.powerScore
        );
      case 'highest_burn':
        return (
          mb.burnScore - ma.burnScore ||
          mb.tokensUsed - ma.tokensUsed ||
          (b.max_output_tokens || 0) - (a.max_output_tokens || 0)
        );
      case 'most_economical':
        return (
          ma.burnScore - mb.burnScore ||
          mb.powerScore - ma.powerScore ||
          (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );
      case 'largest_context':
        return (
          (b.context_window || 0) - (a.context_window || 0) ||
          mb.powerScore - ma.powerScore
        );
      default:
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    }
  });
}
