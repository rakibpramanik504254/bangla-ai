import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { db } from '../db/database.ts';
import { normalizeApiKey, isValidApiKey, OPENROUTER_DEFAULT_BASE_URL } from './openrouter.ts';
import { hasBengaliScript } from '../utils/imageGeneration.ts';
import {
  type VideoAspectRatio,
  type VideoDuration,
  type VideoResolution,
  buildFallbackVideoPrompt,
  getVideoAspectRatioSpec,
  normalizeVideoDuration,
  normalizeVideoResolution,
} from '../utils/videoGeneration.ts';

export class VideoGenerationError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'VideoGenerationError';
    this.statusCode = statusCode;
  }
}

export interface GeneratedVideoResult {
  videoId: string;
  videoUrl: string;
  mimeType: string;
  sizeBytes: number;
  prompt: string;
  enhancedPrompt: string;
  aspectRatio: VideoAspectRatio;
  duration: VideoDuration;
  resolution: VideoResolution;
  width: number;
  height: number;
  provider: 'gemini-omni-1.2-flash';
}

const VIDEO_STORAGE_DIR = path.join(os.tmpdir(), 'bangla-ai-videos');
const SAFE_VIDEO_ID_PATTERN = /^vid_[a-f0-9-]+$/i;

export function resolveGeneratedVideoFilePath(videoId: string): string | null {
  if (!SAFE_VIDEO_ID_PATTERN.test(videoId)) {
    return null;
  }
  return path.join(VIDEO_STORAGE_DIR, `${videoId}.mp4`);
}

async function resolveVideoProviderKeys() {
  const [geminiProvider, openRouterProvider] = await Promise.all([
    db.getProviderBySlug('gemini'),
    db.getProviderBySlug('openrouter'),
  ]);

  const geminiKey = normalizeApiKey(
    geminiProvider?.api_key || process.env.GEMINI_API_KEY
  );
  const isGeminiEnabled = geminiProvider ? geminiProvider.is_active !== false : true;

  const openRouterKey = normalizeApiKey(
    openRouterProvider?.api_key || process.env.OPENROUTER_API_KEY
  );
  const isOpenRouterEnabled = openRouterProvider
    ? openRouterProvider.is_active
    : true;

  return {
    geminiKey: isGeminiEnabled && isValidApiKey(geminiKey) ? geminiKey : '',
    openRouterKey:
      isOpenRouterEnabled && isValidApiKey(openRouterKey) ? openRouterKey : '',
    openRouterBaseUrl: (
      openRouterProvider?.base_url || OPENROUTER_DEFAULT_BASE_URL
    ).replace(/\/+$/, ''),
  };
}

export async function enhanceVideoPrompt(rawPrompt: string): Promise<string> {
  const trimmed = rawPrompt.trim();
  if (!trimmed) return '';

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (!hasBengaliScript(trimmed) && wordCount >= 10) {
    return trimmed;
  }

  const { geminiKey, openRouterKey, openRouterBaseUrl } =
    await resolveVideoProviderKeys();

  const systemInstruction =
    'You are an expert AI cinematographer and video prompt director. ' +
    'Convert the user prompt (which may be in Bengali or English) into a single vivid, concise English text-to-video prompt (max 65 words). ' +
    'Describe subject motion, camera movement, natural lighting, and atmosphere clearly. ' +
    'Output ONLY the English prompt text with no quotes, labels, or explanations.';

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
          maxOutputTokens: 160,
        },
      });
      const candidate = response.text?.trim().replace(/^["']|["']$/g, '');
      if (candidate && candidate.length >= 4 && !hasBengaliScript(candidate)) {
        return candidate;
      }
    } catch (err: any) {
      console.info('[VideoService] Gemini prompt enhancement skipped:', err?.message || err);
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
          'X-Title': 'Bangla AI Video Studio',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: trimmed },
          ],
          max_tokens: 160,
        }),
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data: any = await res.json();
        const text = data?.choices?.[0]?.message?.content
          ?.trim()
          ?.replace(/^["']|["']$/g, '');
        if (text && text.length >= 4 && !hasBengaliScript(text)) {
          return text;
        }
      }
    } catch (err: any) {
      console.info(
        '[VideoService] OpenRouter prompt enhancement skipped:',
        err?.message || err
      );
    }
  }

  return buildFallbackVideoPrompt(trimmed);
}

export async function generateWorkspaceVideo(params: {
  prompt: string;
  aspectRatio?: string;
  duration?: string;
  resolution?: string;
  referenceImageDataUrl?: string;
}): Promise<GeneratedVideoResult> {
  const rawPrompt = params.prompt.trim();
  const spec = getVideoAspectRatioSpec(params.aspectRatio);
  const duration = normalizeVideoDuration(params.duration);
  const resolution = normalizeVideoResolution(params.resolution);

  const { geminiKey } = await resolveVideoProviderKeys();
  if (!geminiKey) {
    throw new VideoGenerationError(
      'AI Video Studio requires an active Gemini API key (configured via Admin Panel or GEMINI_API_KEY).',
      400
    );
  }

  const enhancedPrompt = await enhanceVideoPrompt(rawPrompt);

  const ai = new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  let inputPayload: any = enhancedPrompt;
  if (params.referenceImageDataUrl) {
    const match = params.referenceImageDataUrl.match(
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
    );
    if (match) {
      inputPayload = [
        {
          type: 'image',
          mime_type: match[1],
          data: match[2],
        },
        {
          type: 'text',
          text: enhancedPrompt,
        },
      ];
    }
  }

  let interaction: any;
  try {
    interaction = await (ai.interactions as any).create(
      {
        model: 'gemini-omni-1.2-flash',
        input: inputPayload,
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: spec.id,
          duration,
          resolution,
        },
      },
      { timeout: 300000 }
    );
  } catch (err: any) {
    const rawMsg = err?.message || 'Video generation request failed.';
    if (/PERMISSION_DENIED|API_KEY_INVALID|billing|403/i.test(rawMsg)) {
      throw new VideoGenerationError(
        'Gemini Video Studio requires a billing-enabled Gemini API key with access to gemini-omni-1.2-flash.',
        403
      );
    }
    if (/RESOURCE_EXHAUSTED|429/i.test(rawMsg)) {
      throw new VideoGenerationError(
        'Video generation rate limit or quota reached. Please try again shortly.',
        429
      );
    }
    throw new VideoGenerationError(rawMsg, 502);
  }

  let videoPart: { data?: string; uri?: string; mime_type?: string } | null =
    interaction?.output_video || null;

  if (!videoPart && Array.isArray(interaction?.steps)) {
    for (const step of interaction.steps) {
      if (step?.type === 'model_output' && Array.isArray(step.content)) {
        const found = step.content.find((c: any) => c?.type === 'video');
        if (found) {
          videoPart = found;
          break;
        }
      }
    }
  }

  let videoBuffer: Buffer | null = null;
  let mimeType = videoPart?.mime_type || 'video/mp4';

  if (videoPart?.data) {
    videoBuffer = Buffer.from(videoPart.data, 'base64');
  } else if (videoPart?.uri) {
    const mediaRes = await fetch(videoPart.uri, {
      headers: {
        'x-goog-api-key': geminiKey,
        'User-Agent': 'aistudio-build',
      },
    });
    if (!mediaRes.ok) {
      throw new VideoGenerationError(
        `Failed to retrieve generated video asset (${mediaRes.status}).`,
        502
      );
    }
    mimeType = mediaRes.headers.get('content-type') || mimeType;
    videoBuffer = Buffer.from(await mediaRes.arrayBuffer());
  }

  if (!videoBuffer || videoBuffer.length < 512) {
    throw new VideoGenerationError(
      'Video model completed without returning a playable video stream.',
      502
    );
  }

  const videoId = `vid_${crypto.randomUUID()}`;
  await fs.mkdir(VIDEO_STORAGE_DIR, { recursive: true });
  const filePath = path.join(VIDEO_STORAGE_DIR, `${videoId}.mp4`);
  await fs.writeFile(filePath, videoBuffer);

  return {
    videoId,
    videoUrl: `/api/media/video/${videoId}`,
    mimeType,
    sizeBytes: videoBuffer.length,
    prompt: rawPrompt,
    enhancedPrompt,
    aspectRatio: spec.id,
    duration,
    resolution,
    width: spec.width,
    height: spec.height,
    provider: 'gemini-omni-1.2-flash',
  };
}
