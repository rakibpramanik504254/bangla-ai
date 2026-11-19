import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VIDEO_GENERATION_TOTAL_TOKENS,
  buildFallbackVideoPrompt,
  buildVideoFilename,
  getVideoAspectRatioSpec,
  isGeneratedVideoAttachment,
  normalizeVideoAspectRatio,
  normalizeVideoDuration,
  normalizeVideoResolution,
} from './videoGeneration';

test('video options normalize safely to valid Gemini Omni defaults', () => {
  assert.equal(normalizeVideoAspectRatio('9:16'), '9:16');
  assert.equal(normalizeVideoAspectRatio('1:1'), '16:9');
  assert.equal(normalizeVideoAspectRatio(undefined), '16:9');

  assert.equal(normalizeVideoDuration('5s'), '5s');
  assert.equal(normalizeVideoDuration('8s'), '8s');
  assert.equal(normalizeVideoDuration('10s'), '10s');
  assert.equal(normalizeVideoDuration('99s'), '5s');

  assert.equal(normalizeVideoResolution('1080p'), '1080p');
  assert.equal(normalizeVideoResolution('480p'), '720p');

  const portrait = getVideoAspectRatioSpec('9:16');
  assert.equal(portrait.width, 720);
  assert.equal(portrait.height, 1280);
  assert.equal(VIDEO_GENERATION_TOTAL_TOKENS, 4000);
});

test('buildVideoFilename produces safe mp4 filenames with aspect suffix', () => {
  assert.equal(
    buildVideoFilename('Drone shot over Padma River at sunset!', '16:9'),
    'bangla-ai-drone-shot-over-padma-river-at-sunse-16x9.mp4'
  );
  assert.equal(buildVideoFilename('ঢাকার বৃষ্টি', '9:16'), 'bangla-ai-video-9x16.mp4');
});

test('isGeneratedVideoAttachment identifies generated video messages accurately', () => {
  assert.equal(
    isGeneratedVideoAttachment({
      id: 'vid_1',
      name: 'clip.mp4',
      mimeType: 'video/mp4',
      size: 1024,
      kind: 'video',
      isGeneratedVideo: true,
      videoUrl: '/api/media/video/vid_1',
    }),
    true
  );

  assert.equal(
    isGeneratedVideoAttachment({
      id: 'img_1',
      name: 'art.png',
      mimeType: 'image/png',
      size: 1024,
      kind: 'image',
      isGeneratedImage: true,
      imageUrl: 'https://example.com/art.png',
    }),
    false
  );
});

test('buildFallbackVideoPrompt translates Bengali scenes and strips command verbs', () => {
  const en = buildFallbackVideoPrompt('Generate a short video of Sundarbans sunrise');
  assert.match(en, /^Sundarbans sunrise, smooth camera motion/i);

  const bn = buildFallbackVideoPrompt('ঢাকার বৃষ্টির রাতে রিকশা চলার ভিডিও তৈরি করো');
  assert.match(bn, /Dhaka city street/i);
  assert.match(bn, /rickshaw/i);
  assert.match(bn, /smooth camera motion/i);
});
