import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidApiKey,
  resolveOpenRouterModels,
  buildOpenRouterRequestBody,
  parseOpenRouterStreamPayload
} from './openrouter.ts';

test('isValidApiKey rejects placeholders and short strings, accepts real keys', () => {
  assert.equal(isValidApiKey(''), false);
  assert.equal(isValidApiKey('short'), false);
  assert.equal(isValidApiKey('sk-or-v1-YOUR_OPENROUTER_API_KEY'), false);
  assert.equal(isValidApiKey('AIzaSy_YOUR_GEMINI_API_KEY_HERE'), false);
  assert.equal(isValidApiKey('sk-or-v1-abcdef1234567890abcdef'), true);
});

test('resolveOpenRouterModels maps all Bangla AI workspace models and respects overrides', () => {
  assert.deepEqual(
    resolveOpenRouterModels({ model_name: 'claude-fable-5-2' }),
    { primary: 'anthropic/claude-sonnet-4', fallback: 'anthropic/claude-3.5-sonnet' }
  );
  assert.deepEqual(
    resolveOpenRouterModels({ model_name: 'gemini-4-carbon' }),
    { primary: 'google/gemini-2.5-pro', fallback: 'google/gemini-2.5-flash' }
  );
  assert.deepEqual(
    resolveOpenRouterModels({ model_name: 'gpt-6-astra' }),
    { primary: 'openai/gpt-4o', fallback: 'openai/gpt-4o-mini' }
  );
  assert.deepEqual(
    resolveOpenRouterModels({ model_name: 'grok-4-7' }),
    { primary: 'x-ai/grok-3', fallback: 'x-ai/grok-2-1212' }
  );
  assert.deepEqual(
    resolveOpenRouterModels({ model_name: 'deepseek-r1' }),
    { primary: 'deepseek/deepseek-r1', fallback: 'deepseek/deepseek-chat' }
  );
  assert.deepEqual(
    resolveOpenRouterModels({ model_name: 'claude-fable-5-2', openrouter_model_id: 'anthropic/claude-opus-4' }),
    { primary: 'anthropic/claude-opus-4', fallback: 'openrouter/auto' }
  );
});

test('buildOpenRouterRequestBody sets stream true and prepends system message', () => {
  const body = buildOpenRouterRequestBody(
    'anthropic/claude-3.5-sonnet',
    [{ role: 'user', content: 'Hello' }],
    'You are Bangla AI',
    4096
  );
  assert.equal(body.model, 'anthropic/claude-3.5-sonnet');
  assert.equal(body.stream, true);
  assert.equal(body.max_tokens, 4096);
  assert.deepEqual(body.messages, [
    { role: 'system', content: 'You are Bangla AI' },
    { role: 'user', content: 'Hello' }
  ]);
});

test('parseOpenRouterStreamPayload extracts deltas, usage, errors, and DONE', () => {
  assert.deepEqual(
    parseOpenRouterStreamPayload('{"choices":[{"delta":{"content":"Hi there"}}]}'),
    { textDelta: 'Hi there' }
  );
  assert.deepEqual(
    parseOpenRouterStreamPayload('{"error":{"message":"Invalid credentials"}}'),
    { error: 'Invalid credentials' }
  );
  assert.deepEqual(
    parseOpenRouterStreamPayload('{"usage":{"prompt_tokens":12,"completion_tokens":34},"choices":[]}'),
    { usage: { promptTokens: 12, completionTokens: 34 } }
  );
  assert.deepEqual(parseOpenRouterStreamPayload('[DONE]'), { done: true });
});
