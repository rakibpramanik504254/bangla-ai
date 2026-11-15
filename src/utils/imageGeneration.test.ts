import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackEnhancedPrompt,
  buildImageFilename,
  buildPollinationsImageUrl,
  generateImageSeed,
  getAspectRatioSpec,
  hasBengaliScript,
  isAllowedImageProxyUrl,
  isGeneratedImageAttachment,
  normalizeAspectRatio,
  stripImageCommandPrefixes,
} from './imageGeneration.ts';

test('normalizeAspectRatio defaults to 1:1 and accepts 16:9 / 9:16', () => {
  assert.equal(normalizeAspectRatio('1:1'), '1:1');
  assert.equal(normalizeAspectRatio('16:9'), '16:9');
  assert.equal(normalizeAspectRatio('9:16'), '9:16');
  assert.equal(normalizeAspectRatio('4:3'), '1:1');
  assert.equal(normalizeAspectRatio(undefined), '1:1');
});

test('getAspectRatioSpec maps aspect ratios to exact dimensions and safe outer/inner classes', () => {
  const square = getAspectRatioSpec('1:1');
  assert.equal(square.width, 1024);
  assert.equal(square.height, 1024);
  assert.equal(square.frameClass.includes('aspect-'), false);
  assert.equal(square.aspectClass, 'aspect-square');

  const landscape = getAspectRatioSpec('16:9');
  assert.equal(landscape.width, 1280);
  assert.equal(landscape.height, 720);
  assert.equal(landscape.frameClass.includes('aspect-'), false);
  assert.equal(landscape.aspectClass, 'aspect-video');

  const portrait = getAspectRatioSpec('9:16');
  assert.equal(portrait.width, 720);
  assert.equal(portrait.height, 1280);
  assert.equal(portrait.frameClass.includes('aspect-'), false);
  assert.equal(portrait.aspectClass, 'aspect-[9/16]');
});

test('hasBengaliScript detects Bengali Unicode characters', () => {
  assert.equal(hasBengaliScript('ঢাকার সন্ধ্যায় বৃষ্টি'), true);
  assert.equal(hasBengaliScript('A serene river in Dhaka'), false);
});

test('stripImageCommandPrefixes removes boilerplate creation commands', () => {
  assert.equal(
    stripImageCommandPrefixes('Generate an HD image of a tiger in Sundarbans'),
    'a tiger in Sundarbans'
  );
  assert.equal(
    stripImageCommandPrefixes('একটি ছবি তৈরি করো রিকশার'),
    'রিকশার'
  );
});

test('buildFallbackEnhancedPrompt translates common Bengali themes and enriches short prompts', () => {
  const bnEnhanced = buildFallbackEnhancedPrompt('ঢাকার সন্ধ্যায় বৃষ্টির মধ্যে একটি রিকশা');
  assert.match(bnEnhanced, /Dhaka/i);
  assert.match(bnEnhanced, /rickshaw/i);
  assert.match(bnEnhanced, /rain/i);

  const shortEn = buildFallbackEnhancedPrompt('cyberpunk mosque');
  assert.match(shortEn, /cyberpunk mosque/);
  assert.match(shortEn, /high detail/);
});

test('buildPollinationsImageUrl builds valid nologo URL with width, height, and seed', () => {
  const url = buildPollinationsImageUrl({
    prompt: 'Dhaka skyline sunset',
    width: 1280,
    height: 720,
    seed: 424242,
  });
  assert.ok(url.startsWith('https://image.pollinations.ai/prompt/'));
  assert.ok(url.includes('width=1280'));
  assert.ok(url.includes('height=720'));
  assert.ok(url.includes('seed=424242'));
  assert.ok(url.includes('nologo=true'));
});

test('isAllowedImageProxyUrl allows only https image.pollinations.ai URLs', () => {
  assert.equal(
    isAllowedImageProxyUrl('https://image.pollinations.ai/prompt/test?nologo=true'),
    true
  );
  assert.equal(isAllowedImageProxyUrl('http://image.pollinations.ai/prompt/test'), false);
  assert.equal(isAllowedImageProxyUrl('https://evil.example.com/image.png'), false);
  assert.equal(isAllowedImageProxyUrl('http://127.0.0.1:3000/secret'), false);
});

test('generateImageSeed produces integer seeds in valid range', () => {
  const seed = generateImageSeed();
  assert.equal(Number.isInteger(seed), true);
  assert.ok(seed >= 100000);
});

test('isGeneratedImageAttachment distinguishes generated artwork attachments', () => {
  assert.equal(
    isGeneratedImageAttachment({
      id: 'att_1',
      name: 'artwork.png',
      mimeType: 'image/png',
      size: 1024,
      kind: 'image',
      isGeneratedImage: true,
      imageUrl: 'https://image.pollinations.ai/prompt/test',
    }),
    true
  );
  assert.equal(
    isGeneratedImageAttachment({
      id: 'att_2',
      name: 'notes.txt',
      mimeType: 'text/plain',
      size: 120,
      kind: 'text',
      textContent: 'hello',
    }),
    false
  );
});

test('buildImageFilename formats clean download filenames', () => {
  assert.equal(
    buildImageFilename('Sunset over Padma River!', '16:9'),
    'bangla-ai-sunset-over-padma-river-16x9.png'
  );
  assert.equal(buildImageFilename('ঢাকার ছবি', '9:16'), 'bangla-ai-artwork-9x16.png');
});
