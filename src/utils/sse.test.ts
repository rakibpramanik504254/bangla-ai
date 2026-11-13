import test from 'node:test';
import assert from 'node:assert/strict';
import { createSseLineParser, parseChatStreamPayload } from './sse.ts';

test('createSseLineParser handles split SSE frames across multiple reads', () => {
  const parser = createSseLineParser();

  const part1 = 'data: {"type":"start","chatId":"c1"}\n\ndata: {"type":"chu';
  const part2 = 'nk","text":"Hello "}\n\ndata: {"type":"chunk","text":"World"}\n';
  const part3 = 'data: {"type":"done","assistantMessage":{"id":"m1","content":"Hello World"}}';

  const events1 = parser.feed(part1);
  assert.deepEqual(events1, ['{"type":"start","chatId":"c1"}']);

  const events2 = parser.feed(part2);
  assert.deepEqual(events2, [
    '{"type":"chunk","text":"Hello "}',
    '{"type":"chunk","text":"World"}'
  ]);

  const events3 = parser.feed(part3);
  assert.deepEqual(events3, []);

  const flushed = parser.flush();
  assert.deepEqual(flushed, ['{"type":"done","assistantMessage":{"id":"m1","content":"Hello World"}}']);
});

test('parseChatStreamPayload extracts text chunks, legacy chunks, done metadata, and errors', () => {
  assert.deepEqual(
    parseChatStreamPayload('{"type":"chunk","text":"Bangla AI"}'),
    { kind: 'chunk', text: 'Bangla AI' }
  );

  assert.deepEqual(
    parseChatStreamPayload('{"chunk":"Legacy text"}'),
    { kind: 'chunk', text: 'Legacy text' }
  );

  assert.deepEqual(
    parseChatStreamPayload('{"type":"error","error":"Invalid OpenRouter API key"}'),
    { kind: 'error', message: 'Invalid OpenRouter API key' }
  );

  const doneEvt = parseChatStreamPayload('{"type":"done","assistantMessage":{"id":"m2","content":"Final"}}');
  assert.equal(doneEvt.kind, 'done');
  if (doneEvt.kind === 'done') {
    assert.equal(doneEvt.assistantMessage.content, 'Final');
  }

  assert.deepEqual(parseChatStreamPayload('[DONE]'), { kind: 'done' });
  assert.deepEqual(parseChatStreamPayload('not-json'), { kind: 'ignore' });
});
