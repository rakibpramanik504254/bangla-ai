import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OPENROUTER_FREE_MODELS_CATALOG,
  createSeededFreeModels,
  buildNewFreeModelsFromOpenRouterApi
} from './openrouter-free-models.ts';

test('createSeededFreeModels creates all free models turned OFF by default', () => {
  const models = createSeededFreeModels('2026-11-13T00:00:00.000Z');
  assert.equal(models.length, OPENROUTER_FREE_MODELS_CATALOG.length);
  assert.ok(models.length >= 10);

  for (const m of models) {
    assert.equal(m.is_enabled, false, `Expected ${m.display_name} to start disabled`);
    assert.equal(m.is_free, true);
    assert.equal(m.badge, 'free');
    assert.equal(m.provider_id, 'prov_openrouter');
    assert.ok(m.openrouter_model_id?.endsWith(':free') || m.openrouter_model_id === 'openrouter/free');
  }
});

test('buildNewFreeModelsFromOpenRouterApi adds only new :free text models with is_enabled: false', () => {
  const seeded = createSeededFreeModels('2026-11-13T00:00:00.000Z');
  const apiSample = [
    {
      id: 'google/gemma-4-31b-it:free',
      name: 'Google: Gemma 4 31B (free)',
      context_length: 262144,
      architecture: { output_modalities: ['text'] }
    },
    {
      id: 'meta-llama/llama-4-maverick:free',
      name: 'Meta: Llama 4 Maverick',
      context_length: 131072,
      top_provider: { max_completion_tokens: 16384 },
      description: 'New open Llama 4 Maverick model on free tier.',
      architecture: { output_modalities: ['text'] }
    },
    {
      id: 'openai/gpt-5',
      name: 'OpenAI GPT-5',
      context_length: 400000,
      architecture: { output_modalities: ['text'] }
    },
    {
      id: 'google/lyria-audio:free',
      name: 'Audio Only',
      context_length: 1000,
      architecture: { output_modalities: ['audio'] }
    }
  ];

  const added = buildNewFreeModelsFromOpenRouterApi(apiSample, seeded, '2026-11-13T00:00:00.000Z');
  assert.equal(added.length, 1);
  assert.equal(added[0].model_name, 'meta-llama/llama-4-maverick:free');
  assert.equal(added[0].is_enabled, false);
  assert.equal(added[0].is_free, true);
  assert.equal(added[0].openrouter_model_id, 'meta-llama/llama-4-maverick:free');
});
