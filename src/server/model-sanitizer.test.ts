import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveWorkspaceBadge,
  sanitizeWorkspaceModelName,
  sanitizeWorkspaceDescription,
  sanitizeModelForWorkspace
} from './model-sanitizer';
import { createSeededFreeModels } from './openrouter-free-models';

test('sanitizeWorkspaceModelName strips Free labels and renames OpenRouter Free Router cleanly', () => {
  assert.equal(sanitizeWorkspaceModelName('OpenRouter Free Router (Auto)'), 'Bangla AI Smart Router (Auto)');
  assert.equal(sanitizeWorkspaceModelName('Google Gemma 4 31B (Free)'), 'Google Gemma 4 31B');
  assert.equal(sanitizeWorkspaceModelName('Google: Gemma 4 31B (free)'), 'Google: Gemma 4 31B');
  assert.equal(sanitizeWorkspaceModelName('Cohere North Mini Code - Free'), 'Cohere North Mini Code');
  assert.equal(sanitizeWorkspaceModelName('Claude Fable 5.2 (max)'), 'Claude Fable 5.2 (max)');
});

test('sanitizeWorkspaceDescription removes free tier and zero-cost wording cleanly', () => {
  const routerDesc = sanitizeWorkspaceDescription(
    'Zero-cost smart router that automatically selects an available free OpenRouter model for each request.'
  );
  assert.equal(/\bfree\b|zero[-\s]?cost/i.test(routerDesc), false, `Unexpected wording in: ${routerDesc}`);

  const gemmaDesc = sanitizeWorkspaceDescription(
    'Google open-weight 31B Gemma 4 instruction model via OpenRouter free tier. Strong reasoning and multilingual fluency.'
  );
  assert.equal(/\bfree\b/i.test(gemmaDesc), false, `Unexpected free in: ${gemmaDesc}`);
  assert.ok(gemmaDesc.includes('Strong reasoning and multilingual fluency.'));
});

test('resolveWorkspaceBadge assigns neutral capability badges instead of free', () => {
  assert.equal(
    resolveWorkspaceBadge({ badge: 'free', model_name: 'cohere/north-mini-code:free', display_name: 'Cohere North Mini Code (Free)' }),
    'coding'
  );
  assert.equal(
    resolveWorkspaceBadge({ badge: 'free', model_name: 'nvidia/nemotron-3-nano:free', display_name: 'NVIDIA Nemotron 3 Nano Reasoning (Free)' }),
    'reasoning'
  );
  assert.equal(
    resolveWorkspaceBadge({ badge: 'free', model_name: 'baidu/ernie-5.5-flash-preview:free', display_name: 'Baidu ERNIE 5.5 Flash (Free)' }),
    'super_fast'
  );
  assert.equal(
    resolveWorkspaceBadge({ badge: 'max', model_name: 'claude-fable-5-2', display_name: 'Claude Fable 5.2 (max)' }),
    'max'
  );
});

test('sanitizeModelForWorkspace removes every free indicator across all seeded free models', () => {
  const seeded = createSeededFreeModels('2026-11-13T00:00:00.000Z');
  for (const model of seeded) {
    const publicModel = sanitizeModelForWorkspace(model);
    assert.equal(publicModel.is_free, undefined);
    assert.equal(publicModel.openrouter_model_id, undefined);
    assert.notEqual(publicModel.badge, 'free');
    assert.equal(/\bfree\b|zero[-\s]?cost/i.test(publicModel.display_name), false, `Found free in display_name: ${publicModel.display_name}`);
    assert.equal(/\bfree\b|zero[-\s]?cost/i.test(publicModel.description_en), false, `Found free in description: ${publicModel.description_en}`);
    assert.equal(/\bfree\b/i.test(publicModel.model_name), false, `Found free in model_name: ${publicModel.model_name}`);
  }
});

test('admin custom model names appear in Workspace while stripping any accidental free wording', () => {
  const renamed = sanitizeModelForWorkspace({
    id: 'mod_or_free_gemma_4_31b',
    provider_id: 'prov_openrouter',
    model_name: 'google/gemma-4-31b-it:free',
    display_name: 'Bangla Gemma Ultra',
    description_en: 'Google open-weight 31B Gemma 4 instruction model.',
    badge: 'free',
    is_enabled: true,
    is_default: false,
    is_free: true,
    context_window: 262144,
    max_output_tokens: 32768,
    sort_order: 102,
    openrouter_model_id: 'google/gemma-4-31b-it:free',
    created_at: '2026-11-13T00:00:00.000Z'
  });
  assert.equal(renamed.display_name, 'Bangla Gemma Ultra');
  assert.notEqual(renamed.badge, 'free');

  const renamedWithFreeSuffix = sanitizeModelForWorkspace({
    id: 'mod_or_free_router',
    provider_id: 'prov_openrouter',
    model_name: 'openrouter/free',
    display_name: 'Bangla Smart Pro (Free)',
    description_en: 'Smart routing model.',
    badge: 'free',
    is_enabled: true,
    is_default: false,
    is_free: true,
    context_window: 200000,
    max_output_tokens: 8192,
    sort_order: 101,
    openrouter_model_id: 'openrouter/free',
    created_at: '2026-11-13T00:00:00.000Z'
  });
  assert.equal(renamedWithFreeSuffix.display_name, 'Bangla Smart Pro');
});
