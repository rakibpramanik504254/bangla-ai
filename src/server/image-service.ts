import { GoogleGenAI } from '@google/genai';
import { db } from '../db/database.ts';
import { normalizeApiKey, isValidApiKey, OPENROUTER_DEFAULT_BASE_URL } from './openrouter.ts';
import {
  buildFallbackEnhancedPrompt,
  buildPollinationsImageUrl,
  generateImageSeed,
  getAspectRatioSpec,
  hasBengaliScript,
  type ImageAspectRatio,
} from '../utils/imageGeneration.ts';

export interface GeneratedImageResult {
  imageUrl: string;
  dataUrl?: string;
  mimeType: string;
  sizeBytes: number;
  prompt: string;
  enhancedPrompt: string;
  aspectRatio: ImageAspectRatio;
  width: number;
  height: number;
  seed: number;
  provider: 'pollinations' | 'gemini' | 'openrouter';
}

const MAX_INLINE_IMAGE_BYTES = 2.5 * 1024 * 1024;

async function resolveConfiguredKeys() {
  const [openRouterProvider, geminiProvider] = await Promise.all([
    db.getProviderBySlug('openrouter'),
    db.getProviderBySlug('gemini'),
  ]);

  const openRouterKey = normalizeApiKey(
    openRouterProvider?.api_key || process.env.OPENROUTER_API_KEY
  );
  const isOpenRouterEnabled = openRouterProvider
    ? openRouterProvider.is_active
    : true;

  const geminiKey = normalizeApiKey(
    geminiProvider?.api_key || process.env.GEMINI_API_KEY
  );
  const isGeminiEnabled = geminiProvider ? geminiProvider.is_active !== false : true;

  return {
    openRouterKey: isOpenRouterEnabled && isValidApiKey(openRouterKey) ? openRouterKey : '',
    openRouterBaseUrl: (
      openRouterProvider?.base_url || OPENROUTER_DEFAULT_BASE_URL
    ).replace(/\/+$/, ''),
    geminiKey: isGeminiEnabled && isValidApiKey(geminiKey) ? geminiKey : '',
  };
}

/**
 * Translates Bengali prompts or enhances short English prompts into a crisp English image prompt.
 * Falls back to deterministic enhancement if no AI text key is configured or on timeout.
 */
export async function enhanceImagePrompt(rawPrompt: string): Promise<string> {
  const trimmed = rawPrompt.trim();
  if (!trimmed) return '';

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const needsTranslationOrExpansion = hasBengaliScript(trimmed) || wordCount < 8;
  if (!needsTranslationOrExpansion) {
    return trimmed;
  }

  const { geminiKey, openRouterKey, openRouterBaseUrl } = await resolveConfiguredKeys();

  const systemInstruction =
    'You are an expert AI image prompt translator and art director. ' +
    'Convert the user prompt (which may be in Bengali or English) into a single vivid, concise English image generation prompt (max 55 words). ' +
    'Preserve cultural and subject accuracy (e.g., Bangladesh, Dhaka, rickshaw, river, traditional clothing if mentioned). ' +
    'Add clear lighting, lens/style, and composition cues. Output ONLY the final English prompt text with no quotes, labels, or explanations.';

  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: trimmed,
        config: {
          systemInstruction,
          maxOutputTokens: 140,
          temperature: 0.4,
        },
      });
      const candidate = response.text?.trim().replace(/^["']|["']$/g, '');
      if (candidate && candidate.length >= 4 && !hasBengaliScript(candidate)) {
        return candidate;
      }
    } catch (err: any) {
      console.info('[ImageService] Gemini prompt enhancement skipped:', err?.message || err);
    }
  }

  if (openRouterKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(`${openRouterBaseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'https://bangla-ai.pro',
          'X-Title': 'Bangla AI Image Studio',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: trimmed },
          ],
          max_tokens: 140,
          temperature: 0.4,
        }),
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data: any = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim()?.replace(/^["']|["']$/g, '');
        if (text && text.length >= 4 && !hasBengaliScript(text)) {
          return text;
        }
      }
    } catch (err: any) {
      console.info('[ImageService] OpenRouter prompt enhancement skipped:', err?.message || err);
    }
  }

  return buildFallbackEnhancedPrompt(trimmed);
}

async function tryGenerateWithPollinations(params: {
  enhancedPrompt: string;
  width: number;
  height: number;
  seed: number;
}): Promise<{ imageUrl: string; dataUrl?: string; mimeType: string; sizeBytes: number } | null> {
  const imageUrl = buildPollinationsImageUrl({
    prompt: params.enhancedPrompt,
    width: params.width,
    height: params.height,
    seed: params.seed,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);

  try {
    const res = await fetch(imageUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'image/png,image/jpeg,image/webp,image/*;q=0.9',
        'User-Agent': 'BanglaAI/1.0 (+https://bangla-ai.pro)',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[ImageService] Pollinations HTTP ${res.status}`);
      return null;
    }

    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/')) {
      console.warn(`[ImageService] Pollinations unexpected content-type: ${contentType}`);
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    if (buffer.length < 512) {
      console.warn('[ImageService] Pollinations returned empty/tiny image payload');
      return null;
    }

    const dataUrl =
      buffer.length <= MAX_INLINE_IMAGE_BYTES
        ? `data:${contentType};base64,${buffer.toString('base64')}`
        : undefined;

    return {
      imageUrl,
      dataUrl,
      mimeType: contentType,
      sizeBytes: buffer.length,
    };
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      // Pollinations may still deliver directly to browser if slow from server; surface URL if needed
      console.warn('[ImageService] Pollinations server fetch timed out after 22s');
      return {
        imageUrl,
        mimeType: 'image/png',
        sizeBytes: 0,
      };
    }
    console.warn('[ImageService] Pollinations fetch error:', err?.message || err);
    return null;
  }
}

async function tryGenerateWithGemini(params: {
  geminiKey: string;
  enhancedPrompt: string;
  aspectRatio: ImageAspectRatio;
}): Promise<{ dataUrl: string; mimeType: string; sizeBytes: number } | null> {
  if (!params.geminiKey) return null;

  try {
    const ai = new GoogleGenAI({
      apiKey: params.geminiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [{ text: params.enhancedPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: params.aspectRatio,
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        const buffer = Buffer.from(part.inlineData.data, 'base64');
        return {
          dataUrl: `data:${mimeType};base64,${part.inlineData.data}`,
          mimeType,
          sizeBytes: buffer.length,
        };
      }
    }
  } catch (err: any) {
    console.warn('[ImageService] Gemini image generation failed:', err?.message || err);
  }
  return null;
}

async function tryGenerateWithOpenRouter(params: {
  openRouterKey: string;
  openRouterBaseUrl: string;
  enhancedPrompt: string;
  aspectRatio: ImageAspectRatio;
}): Promise<{ imageUrl?: string; dataUrl?: string; mimeType: string; sizeBytes: number } | null> {
  if (!params.openRouterKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${params.openRouterBaseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${params.openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://bangla-ai.pro',
        'X-Title': 'Bangla AI Image Studio',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        modalities: ['image', 'text'],
        messages: [
          {
            role: 'user',
            content: `${params.enhancedPrompt} (aspect ratio ${params.aspectRatio})`,
          },
        ],
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data: any = await res.json();
    const images = data?.choices?.[0]?.message?.images;
    const urlValue = images?.[0]?.image_url?.url || images?.[0]?.url;
    if (typeof urlValue === 'string' && urlValue.startsWith('data:image/')) {
      const mimeMatch = urlValue.match(/^data:(image\/[^;]+);base64,(.+)$/);
      const mimeType = mimeMatch?.[1] || 'image/png';
      const sizeBytes = mimeMatch?.[2] ? Buffer.from(mimeMatch[2], 'base64').length : 0;
      return { dataUrl: urlValue, mimeType, sizeBytes };
    }
    if (typeof urlValue === 'string' && /^https?:\/\//i.test(urlValue)) {
      return { imageUrl: urlValue, mimeType: 'image/png', sizeBytes: 0 };
    }
  } catch (err: any) {
    clearTimeout(timeout);
    console.warn('[ImageService] OpenRouter image generation failed:', err?.message || err);
  }
  return null;
}

export async function generateWorkspaceImage(params: {
  prompt: string;
  aspectRatio?: string;
  seed?: number;
  preferredProvider?: 'pollinations' | 'gemini' | 'openrouter';
}): Promise<GeneratedImageResult> {
  const rawPrompt = params.prompt.trim();
  const spec = getAspectRatioSpec(params.aspectRatio);
  const seed =
    typeof params.seed === 'number' && Number.isFinite(params.seed) && params.seed > 0
      ? Math.floor(params.seed)
      : generateImageSeed();

  const enhancedPrompt = await enhanceImagePrompt(rawPrompt);
  const { geminiKey, openRouterKey, openRouterBaseUrl } = await resolveConfiguredKeys();

  // Optional explicit Gemini path when requested and key is active
  if (params.preferredProvider === 'gemini' && geminiKey) {
    const geminiResult = await tryGenerateWithGemini({
      geminiKey,
      enhancedPrompt,
      aspectRatio: spec.id,
    });
    if (geminiResult) {
      return {
        imageUrl: geminiResult.dataUrl,
        dataUrl: geminiResult.dataUrl,
        mimeType: geminiResult.mimeType,
        sizeBytes: geminiResult.sizeBytes,
        prompt: rawPrompt,
        enhancedPrompt,
        aspectRatio: spec.id,
        width: spec.width,
        height: spec.height,
        seed,
        provider: 'gemini',
      };
    }
  }

  // Primary zero-cost Pollinations.ai path
  const pollinationsResult = await tryGenerateWithPollinations({
    enhancedPrompt,
    width: spec.width,
    height: spec.height,
    seed,
  });

  if (pollinationsResult && (pollinationsResult.dataUrl || pollinationsResult.imageUrl)) {
    return {
      imageUrl: pollinationsResult.imageUrl,
      dataUrl: pollinationsResult.dataUrl,
      mimeType: pollinationsResult.mimeType,
      sizeBytes: pollinationsResult.sizeBytes,
      prompt: rawPrompt,
      enhancedPrompt,
      aspectRatio: spec.id,
      width: spec.width,
      height: spec.height,
      seed,
      provider: 'pollinations',
    };
  }

  // Fallback to Gemini image generation if Admin configured Gemini key
  if (geminiKey) {
    const geminiResult = await tryGenerateWithGemini({
      geminiKey,
      enhancedPrompt,
      aspectRatio: spec.id,
    });
    if (geminiResult) {
      return {
        imageUrl: geminiResult.dataUrl,
        dataUrl: geminiResult.dataUrl,
        mimeType: geminiResult.mimeType,
        sizeBytes: geminiResult.sizeBytes,
        prompt: rawPrompt,
        enhancedPrompt,
        aspectRatio: spec.id,
        width: spec.width,
        height: spec.height,
        seed,
        provider: 'gemini',
      };
    }
  }

  // Fallback to OpenRouter image generation if Admin configured OpenRouter key
  if (openRouterKey) {
    const orResult = await tryGenerateWithOpenRouter({
      openRouterKey,
      openRouterBaseUrl,
      enhancedPrompt,
      aspectRatio: spec.id,
    });
    if (orResult && (orResult.dataUrl || orResult.imageUrl)) {
      return {
        imageUrl: orResult.imageUrl || orResult.dataUrl!,
        dataUrl: orResult.dataUrl,
        mimeType: orResult.mimeType,
        sizeBytes: orResult.sizeBytes,
        prompt: rawPrompt,
        enhancedPrompt,
        aspectRatio: spec.id,
        width: spec.width,
        height: spec.height,
        seed,
        provider: 'openrouter',
      };
    }
  }

  // Always allow returning the direct Pollinations URL if server network was restricted,
  // or throw if URL couldn't be constructed. Wait: let's check if Pollinations hard-failed vs browser direct load!
  // If Pollinations returned a non-200 error, throw a clear descriptive error so user gets actionable feedback.
  throw new Error(
    'Image generation service is temporarily busy or unreachable. Please try again in a moment.'
  );
}
