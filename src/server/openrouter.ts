import type { ChatAttachment } from '../types/index.ts';
import { buildTextAttachmentPromptBlock } from '../utils/chatAttachments.ts';

export interface OpenRouterModelCandidate {
  primary: string;
  fallback: string;
}

export const OPENROUTER_DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Maps Bangla AI catalog models (`model_name` or `id`) to OpenRouter model slugs.
 * Each entry provides a primary flagship slug and a widely available OpenRouter fallback slug.
 */
export const OPENROUTER_MODEL_MAP: Record<string, OpenRouterModelCandidate> = {
  'gemini-4-carbon': {
    primary: 'google/gemini-2.5-pro',
    fallback: 'google/gemini-2.5-flash'
  },
  mod_gemini_4_carbon: {
    primary: 'google/gemini-2.5-pro',
    fallback: 'google/gemini-2.5-flash'
  },
  'claude-fable-5-2': {
    primary: 'anthropic/claude-sonnet-4',
    fallback: 'anthropic/claude-3.5-sonnet'
  },
  mod_claude_fable_5_2: {
    primary: 'anthropic/claude-sonnet-4',
    fallback: 'anthropic/claude-3.5-sonnet'
  },
  'gpt-6-astra': {
    primary: 'openai/gpt-4o',
    fallback: 'openai/gpt-4o-mini'
  },
  mod_gpt_6_astra: {
    primary: 'openai/gpt-4o',
    fallback: 'openai/gpt-4o-mini'
  },
  'deepseek-v4-1-flash-1017': {
    primary: 'deepseek/deepseek-chat-v3-0324',
    fallback: 'deepseek/deepseek-chat'
  },
  mod_deepseek_v4_1_flash: {
    primary: 'deepseek/deepseek-chat-v3-0324',
    fallback: 'deepseek/deepseek-chat'
  },
  'grok-4-7': {
    primary: 'x-ai/grok-3',
    fallback: 'x-ai/grok-2-1212'
  },
  mod_grok_4_7: {
    primary: 'x-ai/grok-3',
    fallback: 'x-ai/grok-2-1212'
  },
  'kimi-k3-1-pro': {
    primary: 'moonshotai/kimi-k2',
    fallback: 'google/gemini-2.5-flash'
  },
  mod_kimi_k3_1_pro: {
    primary: 'moonshotai/kimi-k2',
    fallback: 'google/gemini-2.5-flash'
  },
  'gemini-2.5-flash': {
    primary: 'google/gemini-2.5-flash',
    fallback: 'google/gemini-2.0-flash-001'
  },
  mod_gemini_2_5_flash: {
    primary: 'google/gemini-2.5-flash',
    fallback: 'google/gemini-2.0-flash-001'
  },
  'gpt-4o': {
    primary: 'openai/gpt-4o',
    fallback: 'openai/gpt-4o-mini'
  },
  mod_gpt_4o: {
    primary: 'openai/gpt-4o',
    fallback: 'openai/gpt-4o-mini'
  },
  'claude-3-5-sonnet': {
    primary: 'anthropic/claude-3.5-sonnet',
    fallback: 'anthropic/claude-3-haiku'
  },
  mod_claude_3_5_sonnet: {
    primary: 'anthropic/claude-3.5-sonnet',
    fallback: 'anthropic/claude-3-haiku'
  },
  'deepseek-r1': {
    primary: 'deepseek/deepseek-r1',
    fallback: 'deepseek/deepseek-chat'
  },
  mod_deepseek_r1: {
    primary: 'deepseek/deepseek-r1',
    fallback: 'deepseek/deepseek-chat'
  }
};

export function normalizeApiKey(key?: string | null): string {
  if (!key) return '';
  return key.trim().replace(/^bearer\s+/i, '').trim();
}

export function isValidApiKey(key?: string | null): boolean {
  const trimmed = normalizeApiKey(key);
  if (trimmed.length < 10) return false;
  const upper = trimmed.toUpperCase();
  if (
    upper.includes('YOUR_OPENROUTER') ||
    upper.includes('YOUR_GEMINI') ||
    upper.includes('YOUR_OPENAI') ||
    upper.includes('YOUR_ANTHROPIC') ||
    upper.includes('YOUR_DEEPSEEK') ||
    upper.includes('PLACEHOLDER')
  ) {
    return false;
  }
  return true;
}

export interface ProviderUpdateInput {
  name?: unknown;
  base_url?: unknown;
  is_active?: unknown;
  api_key?: unknown;
  clear_api_key?: unknown;
}

export function buildProviderUpdatePayload(input: ProviderUpdateInput): {
  name?: string;
  base_url?: string;
  api_key?: string;
  is_active?: boolean;
} {
  const updates: {
    name?: string;
    base_url?: string;
    api_key?: string;
    is_active?: boolean;
  } = {};

  if (typeof input.name === 'string' && input.name.trim() !== '') {
    updates.name = input.name.trim();
  }
  if (typeof input.base_url === 'string' && input.base_url.trim() !== '') {
    updates.base_url = input.base_url.trim();
  }
  if (typeof input.is_active === 'boolean') {
    updates.is_active = input.is_active;
  }

  if (input.clear_api_key === true) {
    updates.api_key = '';
  } else if (typeof input.api_key === 'string') {
    const cleanedKey = normalizeApiKey(input.api_key);
    if (cleanedKey !== '') {
      updates.api_key = cleanedKey;
      // Saving a new API key must activate the provider unless an explicit toggle-only pause is intended
      updates.is_active = true;
    }
  }

  return updates;
}

export function buildGeminiCandidateModels(modelName?: string): string[] {
  const normalized = (modelName || '').toLowerCase();
  if (normalized.includes('lite')) {
    return ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
  }
  return ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
}

export function isRetryableGeminiError(errorMessage?: string): boolean {
  const msg = (errorMessage || '').toLowerCase();
  return (
    msg.includes('not_found') ||
    msg.includes('404') ||
    msg.includes('no longer available') ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('503') ||
    msg.includes('unavailable')
  );
}

export function resolveOpenRouterModels(model: {
  id?: string;
  model_name: string;
  openrouter_model_id?: string;
  is_free?: boolean;
}): OpenRouterModelCandidate {
  const isFreeModel = Boolean(model.is_free || model.model_name.endsWith(':free') || model.model_name === 'openrouter/free');
  const safeFallback = isFreeModel ? 'openrouter/free' : 'openrouter/auto';

  const customSlug = model.openrouter_model_id?.trim();
  if (customSlug) {
    return {
      primary: customSlug,
      fallback: safeFallback
    };
  }

  const byName = OPENROUTER_MODEL_MAP[model.model_name];
  if (byName) return byName;

  if (model.id && OPENROUTER_MODEL_MAP[model.id]) {
    return OPENROUTER_MODEL_MAP[model.id];
  }

  // If user added a raw OpenRouter slug (contains '/'), use it directly
  if (model.model_name.includes('/')) {
    return {
      primary: model.model_name,
      fallback: safeFallback
    };
  }

  return {
    primary: safeFallback,
    fallback: isFreeModel ? 'openrouter/free' : 'google/gemini-2.5-flash'
  };
}

export type OpenRouterContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export function formatMessageContentForOpenRouter(
  content: string,
  attachments?: ChatAttachment[]
): string | OpenRouterContentPart[] {
  const safeAttachments = attachments || [];
  const textBlock = buildTextAttachmentPromptBlock(safeAttachments);
  const combinedText = [content.trim(), textBlock].filter(Boolean).join('\n\n');
  const imageAttachments = safeAttachments.filter(
    a => a.kind === 'image' && !a.isGeneratedImage && Boolean(a.dataUrl)
  );

  if (imageAttachments.length === 0) {
    return combinedText;
  }

  const parts: OpenRouterContentPart[] = [
    {
      type: 'text',
      text: combinedText || 'Please analyze the attached image(s).'
    },
    ...imageAttachments.map(img => ({
      type: 'image_url' as const,
      image_url: { url: img.dataUrl! }
    }))
  ];

  return parts;
}

export function buildOpenRouterRequestBody(
  openRouterModelId: string,
  messages: { role: string; content: string; attachments?: ChatAttachment[] }[],
  systemPrompt: string,
  maxTokens?: number
) {
  return {
    model: openRouterModelId,
    stream: true,
    ...(maxTokens && maxTokens > 0 ? { max_tokens: Math.min(maxTokens, 8192) } : {}),
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role === 'assistant' || m.role === 'system' ? m.role : 'user',
        content: m.role === 'user' ? formatMessageContentForOpenRouter(m.content, m.attachments) : m.content
      }))
    ]
  };
}

export interface OpenRouterParsedLine {
  textDelta?: string;
  reasoningDelta?: string;
  finishReason?: string;
  done?: boolean;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

function extractTextFromContentField(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    let combined = '';
    for (const part of content) {
      if (typeof part === 'string') {
        combined += part;
      } else if (part && typeof part === 'object') {
        const p = part as Record<string, unknown>;
        if (typeof p.text === 'string') {
          combined += p.text;
        } else if (typeof p.content === 'string') {
          combined += p.content;
        }
      }
    }
    return combined;
  }
  return '';
}

export function parseOpenRouterStreamPayload(dataStr: string): OpenRouterParsedLine {
  const trimmed = dataStr.trim();
  if (!trimmed) return {};
  if (trimmed === '[DONE]') return { done: true };

  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {};
  }

  if (parsed?.error) {
    return {
      error: parsed.error.message || (typeof parsed.error === 'string' ? parsed.error : 'OpenRouter upstream error')
    };
  }

  const result: OpenRouterParsedLine = {};
  const choice = parsed?.choices?.[0];
  const delta = choice?.delta;

  const deltaText = extractTextFromContentField(delta?.content);
  const messageText = !deltaText ? extractTextFromContentField(choice?.message?.content) : '';
  const legacyText = !deltaText && !messageText && typeof choice?.text === 'string' ? choice.text : '';
  const textCandidate = deltaText || messageText || legacyText;

  if (textCandidate.length > 0) {
    result.textDelta = textCandidate;
  }

  const reasoningCandidate =
    extractTextFromContentField(delta?.reasoning) ||
    extractTextFromContentField(delta?.reasoning_content) ||
    extractTextFromContentField(choice?.message?.reasoning) ||
    extractTextFromContentField(choice?.message?.reasoning_content);

  if (reasoningCandidate.length > 0) {
    result.reasoningDelta = reasoningCandidate;
  }

  if (typeof choice?.finish_reason === 'string' && choice.finish_reason.length > 0) {
    result.finishReason = choice.finish_reason;
  }

  if (parsed?.usage) {
    result.usage = {
      promptTokens: Number(parsed.usage.prompt_tokens) || 0,
      completionTokens: Number(parsed.usage.completion_tokens) || 0
    };
  }

  return result;
}

export interface OpenRouterKeyStatus {
  ok: boolean;
  error?: string;
  label: string | null;
  isFreeTier: boolean | null;
  dailyFreeRequestLimit: number | null;
  rpmFreeLimit: number;
  usageTotalUsd: number | null;
  usageDailyUsd: number | null;
  usageWeeklyUsd: number | null;
  usageMonthlyUsd: number | null;
  creditLimitUsd: number | null;
  limitRemainingUsd: number | null;
  accountTotalCreditsUsd: number | null;
  accountTotalUsageUsd: number | null;
  accountBalanceUsd: number | null;
  rateLimit: {
    requests: number;
    interval: string;
  } | null;
}

function toOptionalFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function parseOpenRouterKeyInfoResponse(
  keyPayload: any,
  creditsPayload?: any
): OpenRouterKeyStatus {
  const data = keyPayload?.data ?? keyPayload ?? {};
  const isFreeTier = typeof data?.is_free_tier === 'boolean' ? data.is_free_tier : null;
  const dailyFreeRequestLimit =
    isFreeTier === false ? 1000 : isFreeTier === true ? 50 : null;

  const rateLimitObj =
    data?.rate_limit &&
    typeof data.rate_limit === 'object' &&
    Number.isFinite(Number(data.rate_limit.requests)) &&
    typeof data.rate_limit.interval === 'string'
      ? {
          requests: Number(data.rate_limit.requests),
          interval: String(data.rate_limit.interval)
        }
      : null;

  const creditsData = creditsPayload?.data ?? creditsPayload ?? null;
  const accountTotalCreditsUsd = toOptionalFiniteNumber(creditsData?.total_credits);
  const accountTotalUsageUsd = toOptionalFiniteNumber(creditsData?.total_usage);
  const accountBalanceUsd =
    accountTotalCreditsUsd !== null && accountTotalUsageUsd !== null
      ? Math.max(0, Number((accountTotalCreditsUsd - accountTotalUsageUsd).toFixed(6)))
      : null;

  return {
    ok: true,
    label: typeof data?.label === 'string' && data.label.trim() ? data.label.trim() : null,
    isFreeTier,
    dailyFreeRequestLimit,
    rpmFreeLimit: 20,
    usageTotalUsd: toOptionalFiniteNumber(data?.usage),
    usageDailyUsd: toOptionalFiniteNumber(data?.usage_daily),
    usageWeeklyUsd: toOptionalFiniteNumber(data?.usage_weekly),
    usageMonthlyUsd: toOptionalFiniteNumber(data?.usage_monthly),
    creditLimitUsd: toOptionalFiniteNumber(data?.limit),
    limitRemainingUsd: toOptionalFiniteNumber(data?.limit_remaining),
    accountTotalCreditsUsd,
    accountTotalUsageUsd,
    accountBalanceUsd,
    rateLimit: rateLimitObj
  };
}

export async function fetchOpenRouterKeyStatus(
  apiKey: string,
  baseUrl?: string
): Promise<OpenRouterKeyStatus> {
  const cleanKey = normalizeApiKey(apiKey);
  const normalizedBase = (baseUrl || OPENROUTER_DEFAULT_BASE_URL).replace(/\/+$/, '');

  const makeEmptyError = (error: string): OpenRouterKeyStatus => ({
    ok: false,
    error,
    label: null,
    isFreeTier: null,
    dailyFreeRequestLimit: null,
    rpmFreeLimit: 20,
    usageTotalUsd: null,
    usageDailyUsd: null,
    usageWeeklyUsd: null,
    usageMonthlyUsd: null,
    creditLimitUsd: null,
    limitRemainingUsd: null,
    accountTotalCreditsUsd: null,
    accountTotalUsageUsd: null,
    accountBalanceUsd: null,
    rateLimit: null
  });

  if (!isValidApiKey(cleanKey)) {
    return makeEmptyError('OpenRouter API key is not configured.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const headers = {
      Authorization: `Bearer ${cleanKey}`,
      Accept: 'application/json'
    };

    // Try modern /key endpoint first, fallback to legacy /auth/key
    let keyResp = await fetch(`${normalizedBase}/key`, {
      headers,
      signal: controller.signal
    });
    if (keyResp.status === 404) {
      keyResp = await fetch(`${normalizedBase}/auth/key`, {
        headers,
        signal: controller.signal
      });
    }

    if (!keyResp.ok) {
      const errBody = await keyResp.text().catch(() => '');
      let msg = `OpenRouter returned HTTP ${keyResp.status}`;
      try {
        const parsedErr = JSON.parse(errBody);
        msg = parsedErr?.error?.message || parsedErr?.message || msg;
      } catch {
        if (errBody.trim()) msg = `${msg}: ${errBody.trim().slice(0, 140)}`;
      }
      return makeEmptyError(msg);
    }

    const keyPayload = await keyResp.json().catch(() => ({}));

    // Optionally fetch /credits (works on accounts/keys with credits permission; gracefully ignored if forbidden)
    let creditsPayload: any = undefined;
    try {
      const creditsResp = await fetch(`${normalizedBase}/credits`, {
        headers,
        signal: controller.signal
      });
      if (creditsResp.ok) {
        creditsPayload = await creditsResp.json().catch(() => undefined);
      }
    } catch {
      // Optional endpoint; ignore failures
    }

    return parseOpenRouterKeyInfoResponse(keyPayload, creditsPayload);
  } catch (err: any) {
    const msg =
      err?.name === 'AbortError'
        ? 'Timed out while contacting OpenRouter.'
        : err?.message || 'Failed to check OpenRouter key status.';
    return makeEmptyError(msg);
  } finally {
    clearTimeout(timeout);
  }
}

