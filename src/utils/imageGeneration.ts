import type { ChatAttachment } from '../types/index.ts';

export type ImageAspectRatio = '1:1' | '16:9' | '9:16';

export interface AspectRatioSpec {
  id: ImageAspectRatio;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  frameClass: string;
  aspectClass: string;
}

export const IMAGE_ASPECT_RATIOS: AspectRatioSpec[] = [
  {
    id: '1:1',
    label: '1:1 Square',
    shortLabel: '1:1',
    width: 1024,
    height: 1024,
    frameClass: 'max-w-[440px]',
    aspectClass: 'aspect-square',
  },
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

export const IMAGE_GENERATION_PROMPT_TOKENS = 250;
export const IMAGE_GENERATION_COMPLETION_TOKENS = 1250;
export const IMAGE_GENERATION_TOTAL_TOKENS =
  IMAGE_GENERATION_PROMPT_TOKENS + IMAGE_GENERATION_COMPLETION_TOKENS;

export function hasBengaliScript(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

export function normalizeAspectRatio(input?: string | null): ImageAspectRatio {
  if (input === '16:9' || input === '9:16' || input === '1:1') {
    return input;
  }
  return '1:1';
}

export function getAspectRatioSpec(ratio?: string | null): AspectRatioSpec {
  const normalized = normalizeAspectRatio(ratio);
  return (
    IMAGE_ASPECT_RATIOS.find((spec) => spec.id === normalized) ||
    IMAGE_ASPECT_RATIOS[0]
  );
}

export function generateImageSeed(): number {
  return Math.floor(100000 + Math.random() * 8999999);
}

const BENGALI_SUBJECT_TRANSLATIONS: Array<[RegExp, string]> = [
  [/ঢাকা|ঢাকার/gi, 'Dhaka city in Bangladesh'],
  [/রিকশা/gi, 'colorful traditional Bangladeshi cycle rickshaw'],
  [/বৃষ্টি|বৃষ্টির/gi, 'dramatic monsoon rain with wet glowing reflections'],
  [/সন্ধ্যা|সন্ধ্যায়|সন্ধ্যায়/gi, 'golden twilight evening atmosphere'],
  [/সূর্যাস্ত/gi, 'vibrant sunset sky'],
  [/সূর্যোদয়|সূর্যোদয়/gi, 'warm sunrise light'],
  [/নদী|পদ্মা|মেঘনা|বুড়িগঙ্গা/gi, 'serene Bangladeshi river with wooden boats'],
  [/নৌকা/gi, 'traditional wooden boat on calm water'],
  [/গ্রাম|গ্রামের/gi, 'lush green Bangladeshi countryside village'],
  [/পাহাড়|পাহাড়|সাজেক|বান্দরবান/gi, 'misty green mountains'],
  [/সমুদ্র|কক্সবাজার/gi, 'scenic ocean shoreline at golden hour'],
  [/ফুল|শাপলা|গোলাপ/gi, 'blooming fresh flowers with delicate petals'],
  [/মসজিদ/gi, 'architectural mosque with warm ambient lanterns'],
  [/শহীদ মিনার/gi, 'Shaheed Minar monument in Dhaka'],
  [/বিড়াল|বিড়াল/gi, 'expressive fluffy cat'],
  [/বাঘ|রয়েল বেঙ্গল/gi, 'majestic Royal Bengal tiger in lush Sundarbans forest'],
  [/মেয়ে|মেয়ে/gi, 'young Bangladeshi woman'],
  [/ছেলে/gi, 'young Bangladeshi man'],
  [/চা|চায়ের|চায়ের/gi, 'steaming cup of hot tea'],
  [/বই/gi, 'aesthetic vintage books'],
  [/আকাশ/gi, 'dramatic sky'],
  [/রাত|রাতের/gi, 'atmospheric night scene with soft bokeh lights'],
  [/আধুনিক/gi, 'modern futuristic aesthetic'],
  [/সিনেমাটিক/gi, 'cinematic lighting'],
  [/বাস্তবসম্মত/gi, 'photorealistic ultra detailed'],
  [/লোগো/gi, 'clean minimalist vector brand logo design'],
  [/পোস্টার/gi, 'editorial graphic design poster layout'],
];

const COMMAND_PREFIX_PATTERNS = [
  /^(please\s+)?(create|generate|make|draw|paint|render|design)\s+(an?\s+)?(hd\s+|high quality\s+)?(image|picture|photo|illustration|artwork|drawing|wallpaper|poster|logo)\s+(of|for|about|showing)?\s*/i,
  /^(দয়া করে\s+|একটা\s+|একটি\s+)?(ছবি|চিত্র|পোস্টার|লোগো|আর্ট)\s*(তৈরি করো|তৈরি করুন|বানাও|বানান|আঁকো|আঁকুন|দাও|দিন)?\s*/i,
];

export function stripImageCommandPrefixes(prompt: string): string {
  let cleaned = prompt.trim();
  for (const pattern of COMMAND_PREFIX_PATTERNS) {
    cleaned = cleaned.replace(pattern, '').trim();
  }
  return cleaned || prompt.trim();
}

export function buildFallbackEnhancedPrompt(rawPrompt: string): string {
  const cleaned = stripImageCommandPrefixes(rawPrompt);
  if (!cleaned) return '';

  let working = cleaned;
  if (hasBengaliScript(working)) {
    const matchedThemes: string[] = [];
    for (const [pattern, englishPhrase] of BENGALI_SUBJECT_TRANSLATIONS) {
      if (pattern.test(working)) {
        matchedThemes.push(englishPhrase);
      }
    }
    const strippedLatin = working.replace(/[\u0980-\u09FF]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (matchedThemes.length > 0) {
      working = [matchedThemes.join(', '), strippedLatin].filter(Boolean).join(', ');
    } else if (strippedLatin.length >= 4) {
      working = `${strippedLatin}, evocative South Asian visual scene`;
    } else {
      working = `Rich artistic illustration inspired by: ${cleaned}`;
    }
  }

  const lower = working.toLowerCase();
  const hasQualityCue =
    lower.includes('detailed') ||
    lower.includes('photorealistic') ||
    lower.includes('cinematic') ||
    lower.includes('4k') ||
    lower.includes('8k') ||
    lower.includes('studio lighting');

  if (hasQualityCue) {
    return working;
  }

  const wordCount = working.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 8) {
    return `${working}, high detail, balanced composition, natural cinematic lighting, sharp focus`;
  }
  return `${working}, high detail, sharp focus`;
}

export function buildPollinationsImageUrl(params: {
  prompt: string;
  width: number;
  height: number;
  seed: number;
}): string {
  const encodedPrompt = encodeURIComponent(params.prompt.trim());
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${params.width}&height=${params.height}&seed=${params.seed}&nologo=true`;
}

export function isAllowedImageProxyUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'image.pollinations.ai'
    );
  } catch {
    return false;
  }
}

export function isGeneratedImageAttachment(att: ChatAttachment): boolean {
  return Boolean(
    att &&
      att.kind === 'image' &&
      (att.isGeneratedImage || (att.imageUrl && !att.textContent))
  );
}

export function buildImageFilename(prompt: string, aspectRatio: ImageAspectRatio): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  const ratioSlug = aspectRatio.replace(':', 'x');
  return `bangla-ai-${slug || 'artwork'}-${ratioSlug}.png`;
}
