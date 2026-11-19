import type { ChatAttachment } from '../types/index.ts';
import { hasBengaliScript } from './imageGeneration.ts';

export type VideoAspectRatio = '16:9' | '9:16';
export type VideoDuration = '5s' | '8s' | '10s';
export type VideoResolution = '720p' | '1080p';

export interface VideoAspectRatioSpec {
  id: VideoAspectRatio;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  frameClass: string;
  aspectClass: string;
}

export const VIDEO_ASPECT_RATIOS: VideoAspectRatioSpec[] = [
  {
    id: '16:9',
    label: '16:9 Landscape',
    shortLabel: '16:9',
    width: 1280,
    height: 720,
    frameClass: 'max-w-[600px]',
    aspectClass: 'aspect-video',
  },
  {
    id: '9:16',
    label: '9:16 Portrait / Reels',
    shortLabel: '9:16',
    width: 720,
    height: 1280,
    frameClass: 'max-w-[330px]',
    aspectClass: 'aspect-[9/16]',
  },
];

export const VIDEO_DURATIONS: Array<{ id: VideoDuration; label: string }> = [
  { id: '5s', label: '5s' },
  { id: '8s', label: '8s' },
  { id: '10s', label: '10s' },
];

export const VIDEO_RESOLUTIONS: Array<{ id: VideoResolution; label: string }> = [
  { id: '720p', label: '720p HD' },
  { id: '1080p', label: '1080p Full HD' },
];

export const VIDEO_GENERATION_PROMPT_TOKENS = 400;
export const VIDEO_GENERATION_COMPLETION_TOKENS = 3600;
export const VIDEO_GENERATION_TOTAL_TOKENS =
  VIDEO_GENERATION_PROMPT_TOKENS + VIDEO_GENERATION_COMPLETION_TOKENS;

export function normalizeVideoAspectRatio(input?: string | null): VideoAspectRatio {
  return input === '9:16' ? '9:16' : '16:9';
}

export function normalizeVideoDuration(input?: string | null): VideoDuration {
  if (input === '5s' || input === '8s' || input === '10s') {
    return input;
  }
  return '5s';
}

export function normalizeVideoResolution(input?: string | null): VideoResolution {
  return input === '1080p' ? '1080p' : '720p';
}

export function getVideoAspectRatioSpec(ratio?: string | null): VideoAspectRatioSpec {
  const normalized = normalizeVideoAspectRatio(ratio);
  return (
    VIDEO_ASPECT_RATIOS.find((spec) => spec.id === normalized) ||
    VIDEO_ASPECT_RATIOS[0]
  );
}

export function isGeneratedVideoAttachment(att: ChatAttachment): boolean {
  return Boolean(
    att &&
      att.kind === 'video' &&
      (att.isGeneratedVideo || Boolean(att.videoUrl))
  );
}

export function buildVideoFilename(
  prompt: string,
  aspectRatio: VideoAspectRatio
): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  const ratioSlug = aspectRatio.replace(':', 'x');
  return `bangla-ai-${slug || 'video'}-${ratioSlug}.mp4`;
}

const VIDEO_COMMAND_PREFIXES = [
  /^(please\s+)?(create|generate|make|render|animate)\s+(a\s+)?(short\s+|hd\s+|cinematic\s+)?video\s+(of|for|about|showing)?\s*/i,
  /^(দয়া করে\s+|একটা\s+|একটি\s+)?ভিডিও\s*(তৈরি করো|তৈরি করুন|বানাও|বানান|দাও|দিন)?\s*/i,
];

const BENGALI_VIDEO_TRANSLATIONS: Array<[RegExp, string]> = [
  [/ঢাকা|ঢাকার/gi, 'Dhaka city street in Bangladesh'],
  [/রিকশা/gi, 'colorful traditional Bangladeshi cycle rickshaw moving smoothly'],
  [/বৃষ্টি|বৃষ্টির/gi, 'monsoon raindrops falling with cinematic street reflections'],
  [/নদী|পদ্মা|মেঘনা/gi, 'serene Bangladeshi river with gentle ripples and wooden boats gliding'],
  [/নৌকা/gi, 'traditional wooden boat floating peacefully on calm water'],
  [/গ্রাম|গ্রামের/gi, 'lush green Bangladeshi countryside village in golden sunlight'],
  [/সমুদ্র|কক্সবাজার/gi, 'scenic ocean waves crashing gently along Coxs Bazar shoreline'],
  [/রাত|রাতের/gi, 'atmospheric night scene with warm glowing bokeh city lights'],
];

export function buildFallbackVideoPrompt(rawPrompt: string): string {
  let working = rawPrompt.trim();
  for (const pattern of VIDEO_COMMAND_PREFIXES) {
    working = working.replace(pattern, '').trim();
  }
  if (!working) working = rawPrompt.trim();

  if (hasBengaliScript(working)) {
    const matchedThemes: string[] = [];
    for (const [pattern, englishPhrase] of BENGALI_VIDEO_TRANSLATIONS) {
      if (pattern.test(working)) {
        matchedThemes.push(englishPhrase);
      }
    }
    const strippedLatin = working
      .replace(/[\u0980-\u09FF]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (matchedThemes.length > 0) {
      working = [matchedThemes.join(', '), strippedLatin].filter(Boolean).join(', ');
    } else if (strippedLatin.length >= 4) {
      working = `${strippedLatin}, evocative South Asian cinematic motion scene`;
    } else {
      working = `Cinematic motion video inspired by: ${working}`;
    }
  }

  const lower = working.toLowerCase();
  if (lower.includes('smooth camera') || lower.includes('cinematic lighting')) {
    return working;
  }
  return `${working}, smooth camera motion, natural cinematic lighting, crisp 24fps film detail`;
}
