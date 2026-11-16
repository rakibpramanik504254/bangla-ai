export interface ModelTierComparable {
  is_free?: boolean | null;
  badge?: string | null;
  model_name: string;
}

export function isFreeAiModel(model: ModelTierComparable): boolean {
  return Boolean(
    model.is_free ||
      model.badge === 'free' ||
      model.model_name.endsWith(':free') ||
      model.model_name === 'openrouter/free'
  );
}

export function isPaidAiModel(model: ModelTierComparable): boolean {
  return !isFreeAiModel(model);
}

export function partitionAiModelsByTier<T extends ModelTierComparable>(models: T[]): {
  paidModels: T[];
  freeModels: T[];
} {
  const paidModels: T[] = [];
  const freeModels: T[] = [];

  for (const model of models) {
    if (isFreeAiModel(model)) {
      freeModels.push(model);
    } else {
      paidModels.push(model);
    }
  }

  return { paidModels, freeModels };
}
