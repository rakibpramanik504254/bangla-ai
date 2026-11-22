import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeededFreeModels } from '../server/openrouter-free-models.ts';
import {
  evaluateFreeModelMetrics,
  extractParameterBillions,
  sortFreeModels
} from './freeModelRanking.ts';
import type { AiModel } from '../types/index.ts';

const seededFree = createSeededFreeModels('2026-11-21T00:00:00.000Z');

test('extractParameterBillions parses model size in billions accurately', () => {
  assert.equal(extractParameterBillions('nvidia/nemotron-3-ultra-550b-a55b:free'), 550);
  assert.equal(extractParameterBillions('google/gemma-4-31b-it:free'), 31);
  assert.equal(extractParameterBillions('liquid/lfm-3-1.7b:free'), 1.7);
  assert.equal(extractParameterBillions('openrouter/free'), null);
});

test('sortFreeModels ranks Most Powerful from flagship 550B down to compact 1.7B', () => {
  const sorted = sortFreeModels(seededFree, 'most_powerful');
  assert.equal(sorted[0].id, 'mod_or_free_nemotron_3_ultra');
  assert.equal(sorted[sorted.length - 1].id, 'mod_or_free_lfm_3_1_7b');

  const ultraMetrics = evaluateFreeModelMetrics(sorted[0]);
  const lightMetrics = evaluateFreeModelMetrics(sorted[sorted.length - 1]);
  assert.equal(ultraMetrics.powerLabel, 'Ultra');
  assert.equal(lightMetrics.powerLabel, 'Light');
  assert.ok(ultraMetrics.powerScore > lightMetrics.powerScore);
});

test('sortFreeModels ranks Most Consumed by actual token usage first, then burn score', () => {
  const usageMap = {
    mod_or_free_gemma_4_31b: 45000,
    mod_or_free_lfm_3_1_7b: 12000
  };
  const sorted = sortFreeModels(seededFree, 'most_used', usageMap);
  assert.equal(sorted[0].id, 'mod_or_free_gemma_4_31b');
  assert.equal(sorted[1].id, 'mod_or_free_lfm_3_1_7b');
});

test('sortFreeModels ranks Heavy Burn vs Most Economical inversely and excludes paid models', () => {
  const paidModel: AiModel = {
    id: 'mod_gpt_4o',
    provider_id: 'prov_openrouter',
    model_name: 'gpt-4o',
    display_name: 'GPT-4o',
    description_en: 'Paid model',
    badge: 'max',
    is_enabled: true,
    is_default: false,
    is_free: false,
    context_window: 128000,
    max_output_tokens: 16384,
    sort_order: 1,
    created_at: '2026-11-21T00:00:00.000Z'
  };

  const mixed = [paidModel, ...seededFree];
  const heavyFirst = sortFreeModels(mixed, 'highest_burn');
  const lightFirst = sortFreeModels(mixed, 'most_economical');

  assert.equal(heavyFirst.some(m => m.id === 'mod_gpt_4o'), false);
  assert.equal(heavyFirst[0].id, 'mod_or_free_nemotron_3_ultra');
  assert.equal(lightFirst[0].id, 'mod_or_free_lfm_3_1_7b');
});
