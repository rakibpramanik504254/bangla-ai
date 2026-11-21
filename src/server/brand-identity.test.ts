import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStreamingBrandSanitizer,
  matchInstantBrandResponse,
  sanitizeBrandIdentityLeaks,
} from './brand-identity.ts';

test('matchInstantBrandResponse welcomes users to Bangla AI in English, Bengali, and Banglish', () => {
  const en = matchInstantBrandResponse('hi');
  assert.ok(en && en.includes('Welcome to **Bangla AI**'));

  const enHello = matchInstantBrandResponse('Hello!');
  assert.ok(enHello && enHello.includes('Welcome to **Bangla AI**'));

  const bn = matchInstantBrandResponse('হাই');
  assert.ok(bn && bn.includes('Bangla AI'));

  const bnSalam = matchInstantBrandResponse('আসসালামু আলাইকুম');
  assert.ok(bnSalam && bnSalam.includes('ওয়ালাইকুম আসসালাম') && bnSalam.includes('Bangla AI'));

  const banglish = matchInstantBrandResponse('kemon acho?');
  assert.ok(banglish && banglish.includes('Bangla AI'));
});

test('matchInstantBrandResponse handles direct model/identity questions without revealing backend vendors', () => {
  for (const q of [
    'Who are you?',
    'What model are you?',
    'Are you ChatGPT?',
    'Are you DeepSeek?',
    'Who created you?',
    'tumi kon model?',
    'তুমি কোন মডেল?',
    'তোমাকে কে বানিয়েছে?',
  ]) {
    const reply = matchInstantBrandResponse(q);
    assert.ok(reply, `Expected instant brand reply for: ${q}`);
    assert.ok(reply!.includes('Bangla AI'));
    assert.doesNotMatch(reply!, /OpenAI|Google|Gemini|Claude|DeepSeek|Qwen|Llama|Anthropic|OpenRouter/i);
  }
});

test('matchInstantBrandResponse does not intercept real tasks or messages with attachments', () => {
  assert.equal(matchInstantBrandResponse('Hi, please write a React login component'), null);
  assert.equal(matchInstantBrandResponse('Compare GPT and Claude pricing'), null);
  assert.equal(matchInstantBrandResponse('hi', true), null);
});

test('sanitizeBrandIdentityLeaks rewrites English and Bengali vendor/model self-disclosures to Bangla AI', () => {
  assert.equal(
    sanitizeBrandIdentityLeaks('Hello! I am ChatGPT, a large language model trained by OpenAI.'),
    'Hello! I am Bangla AI.'
  );
  assert.equal(
    sanitizeBrandIdentityLeaks("I'm Gemini, a large language model built by Google."),
    'I\'m Bangla AI.'
  );
  assert.equal(
    sanitizeBrandIdentityLeaks('I am Claude, an AI assistant created by Anthropic. How can I help?'),
    'I am Bangla AI. How can I help?'
  );
  assert.equal(
    sanitizeBrandIdentityLeaks('I am DeepSeek, developed by DeepSeek. Let me help you.'),
    'I am Bangla AI. Let me help you.'
  );
  assert.equal(
    sanitizeBrandIdentityLeaks('I was created by Alibaba Cloud and Qwen.'),
    'I am Bangla AI.'
  );
  assert.equal(
    sanitizeBrandIdentityLeaks('আমি একটি বৃহৎ ভাষা মডেল, যা গুগল দ্বারা প্রশিক্ষিত।'),
    'আমি Bangla AI, আপনার স্মার্ট AI অ্যাসিস্ট্যান্ট।'
  );
  assert.equal(
    sanitizeBrandIdentityLeaks('হ্যালো! আমি ডিপসিক, আপনাকে সাহায্য করতে প্রস্তুত।'),
    'হ্যালো! আমি Bangla AI, আপনাকে সাহায্য করতে প্রস্তুত।'
  );
});

test('sanitizeBrandIdentityLeaks preserves normal third-party discussions and fenced code blocks', () => {
  const normal = 'Google was founded in 1998 and OpenAI released Whisper as an open-source speech model.';
  assert.equal(sanitizeBrandIdentityLeaks(normal), normal);

  const code = 'Here is an example:\n```python\nimport openai\nclient = openai.OpenAI()\n```\nDone!';
  assert.equal(sanitizeBrandIdentityLeaks(code), code);
});

test('createStreamingBrandSanitizer catches leaks split across multiple SSE chunks', () => {
  const sanitizer = createStreamingBrandSanitizer();
  const chunks = ['Hi! I am ', 'Clau', 'de, an AI assistant ', 'created by Anth', 'ropic. ', 'How can I help?'];
  let output = '';
  for (const chunk of chunks) {
    output += sanitizer.push(chunk);
  }
  output += sanitizer.flush();

  assert.equal(output, 'Hi! I am Bangla AI. How can I help?');
});
