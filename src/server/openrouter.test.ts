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
  assert.deepEqual(
    resolveOpenRouterModels({
      model_name: 'google/gemma-4-31b-it:free',
      openrouter_model_id: 'google/gemma-4-31b-it:free',
      is_free: true
    }),
    { primary: 'google/gemma-4-31b-it:free', fallback: 'openrouter/free' }
  );
  assert.deepEqual(
    resolveOpenRouterModels({
      model_name: 'openrouter/free',
      openrouter_model_id: 'openrouter/free',
      is_free: true
    }),
    { primary: 'openrouter/free', fallback: 'openrouter/free' }
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

test('buildOpenRouterRequestBody formats image_url parts and text file context for user attachments', () => {
  const body = buildOpenRouterRequestBody(
    'openai/gpt-4o',
    [
      {
        role: 'user',
        content: 'Inspect these files',
        attachments: [
          {
            id: 'img1',
            name: 'screen.png',
            mimeType: 'image/png',
            size: 512,
            kind: 'image',
            dataUrl: 'data:image/png;base64,AAAA'
          },
          {
            id: 'txt1',
            name: 'config.json',
            mimeType: 'application/json',
            size: 20,
            kind: 'text',
            textContent: '{"ok":true}'
          }
        ]
      }
    ],
    'System',
    2048
  );

  assert.equal(body.messages.length, 2);
  const userMsg = body.messages[1];
  assert.equal(userMsg.role, 'user');
  assert.ok(Array.isArray(userMsg.content));
  assert.equal(userMsg.content[0].type, 'text');
  assert.match((userMsg.content[0] as { type: 'text'; text: string }).text, /Inspect these files/);
  assert.match((userMsg.content[0] as { type: 'text'; text: string }).text, /\[Attached File: config\.json\]/);
  assert.deepEqual(userMsg.content[1], {
    type: 'image_url',
    image_url: { url: 'data:image/png;base64,AAAA' }
  });
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
