import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_BRAND_LOGOS,
  isValidBrandIconKey,
  inferDefaultBrandIcon,
  resolveEffectiveModelIcon,
  resolveEffectiveModelName,
  resolveEffectiveModelDescription,
  isModelCustomized,
} from './modelBrandIcons.ts';

test('AI_BRAND_LOGOS includes all 13 required brand icon keys', () => {
  const keys = AI_BRAND_LOGOS.map((b) => b.key);
  assert.deepEqual(keys, [
    'openai',
    'claude',
    'gemini',
    'deepseek',
    'grok',
    'kimi',
    'meta',
    'qwen',
    'mistral',
    'perplexity',
    'nvidia',
    'cohere',
    'default',
  ]);
  assert.equal(isValidBrandIconKey('meta'), true);
  assert.equal(isValidBrandIconKey('nvidia'), true);
  assert.equal(isValidBrandIconKey('unknown-brand'), false);
});

test('inferDefaultBrandIcon resolves provider slugs accurately including NVIDIA, Meta, Qwen, Mistral, Cohere', () => {
  assert.equal(inferDefaultBrandIcon({ id: 'm1', model_name: 'nvidia/nemotron-3-ultra-550b-a55b:free' }), 'nvidia');
  assert.equal(inferDefaultBrandIcon({ id: 'm2', model_name: 'meta-llama/llama-3.3-70b-instruct:free' }), 'meta');
  assert.equal(inferDefaultBrandIcon({ id: 'm3', model_name: 'qwen/qwen3-coder:free' }), 'qwen');
  assert.equal(inferDefaultBrandIcon({ id: 'm4', model_name: 'mistralai/mistral-small-3.1:free' }), 'mistral');
  assert.equal(inferDefaultBrandIcon({ id: 'm5', model_name: 'cohere/north-mini-code:free' }), 'cohere');
  assert.equal(inferDefaultBrandIcon({ id: 'm6', model_name: 'google/gemma-4-31b-it:free' }), 'gemini');
  assert.equal(inferDefaultBrandIcon({ id: 'm7', model_name: 'openrouter/free' }), 'default');
});

test('effective name/icon/description prefer custom values and reset detection identifies customized models', () => {
  const baseModel = {
    id: 'mod_or_free_gemma_4_31b',
    provider_id: 'prov_openrouter',
    model_name: 'google/gemma-4-31b-it:free',
    display_name: 'Google Gemma 4 31B (Free)',
    description_en: 'Google open-weight 31B Gemma 4 instruction model.',
    default_name: 'Google Gemma 4 31B (Free)',
    default_description: 'Google open-weight 31B Gemma 4 instruction model.',
    default_icon: 'gemini',
    custom_name: null,
    custom_description: null,
    custom_icon: null,
  };

  assert.equal(isModelCustomized(baseModel), false);
  assert.equal(resolveEffectiveModelIcon(baseModel), 'gemini');
  assert.equal(resolveEffectiveModelName(baseModel), 'Google Gemma 4 31B (Free)');

  const customized = {
    ...baseModel,
    custom_name: 'DeepSeek R1 Turbo',
    custom_description: 'Deep chain-of-thought reasoning assistant.',
    custom_icon: 'deepseek',
  };

  assert.equal(isModelCustomized(customized), true);
  assert.equal(resolveEffectiveModelIcon(customized), 'deepseek');
  assert.equal(resolveEffectiveModelName(customized), 'DeepSeek R1 Turbo');
  assert.equal(resolveEffectiveModelDescription(customized), 'Deep chain-of-thought reasoning assistant.');
});
