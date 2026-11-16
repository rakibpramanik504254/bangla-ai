import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isFreeAiModel, isPaidAiModel, partitionAiModelsByTier } from './modelTier.ts';

describe('modelTier classification', () => {
  it('distinguishes paid flagship models from OpenRouter free models', () => {
    const models = [
      { id: '1', model_name: 'anthropic/claude-opus-4.6', badge: 'flagship', is_free: false },
      { id: '2', model_name: 'openai/gpt-5.4', badge: 'reasoning', is_free: false },
      { id: '3', model_name: 'openrouter/free', badge: 'free', is_free: true },
      { id: '4', model_name: 'google/gemma-4-31b-it:free', badge: 'free', is_free: false },
      { id: '5', model_name: 'custom/free-model', badge: 'fast', is_free: true }
    ];

    assert.equal(isPaidAiModel(models[0]), true);
    assert.equal(isFreeAiModel(models[0]), false);
    assert.equal(isPaidAiModel(models[1]), true);
    assert.equal(isFreeAiModel(models[2]), true);
    assert.equal(isFreeAiModel(models[3]), true);
    assert.equal(isFreeAiModel(models[4]), true);
    assert.equal(isPaidAiModel(models[4]), false);

    const { paidModels, freeModels } = partitionAiModelsByTier(models);
    assert.deepEqual(
      paidModels.map(m => m.id),
      ['1', '2']
    );
    assert.deepEqual(
      freeModels.map(m => m.id),
      ['3', '4', '5']
    );
  });
});
