import crypto from 'node:crypto';
import type { AiModel } from '../types/index.ts';
import { resolveOpenRouterModels } from '../server/openrouter.ts';

export const DEVELOPER_API_BASE_URL = 'https://bangla-ai.pro/api/v1';
export const DEVELOPER_API_KEY_PREFIX = 'sk-banglaai-';
export const DEFAULT_API_DAILY_LIMIT = 50;
export const DEFAULT_API_INITIAL_CREDITS = 50;
export const MAX_API_KEYS_PER_USER = 5;

export interface DeveloperApiKeyRecord {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  is_enabled: boolean;
  credits: number;
  daily_limit: number;
  daily_requests_used: number;
  daily_usage_date: string;
  total_requests: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicDeveloperApiKey {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  name: string;
  key_prefix: string;
  is_enabled: boolean;
  credits: number;
  daily_limit: number;
  daily_requests_used: number;
  daily_remaining: number;
  daily_usage_date: string;
  total_requests: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export function getUtcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function hashDeveloperApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

export function maskDeveloperApiKey(rawKey: string): string {
  const clean = rawKey.trim();
  if (clean.length <= 18) return `${clean.slice(0, 12)}...`;
  return `${clean.slice(0, 16)}...${clean.slice(-4)}`;
}

export function generateDeveloperApiKey(): {
  plainKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const randomSecret = crypto.randomBytes(24).toString('hex');
  const plainKey = `${DEVELOPER_API_KEY_PREFIX}${randomSecret}`;
  return {
    plainKey,
    keyHash: hashDeveloperApiKey(plainKey),
    keyPrefix: maskDeveloperApiKey(plainKey)
  };
}

export function isValidDeveloperApiKeyFormat(rawKey: string | null | undefined): boolean {
  if (typeof rawKey !== 'string') return false;
  const trimmed = rawKey.trim();
  if (!trimmed.startsWith(DEVELOPER_API_KEY_PREFIX)) return false;
  const secretPart = trimmed.slice(DEVELOPER_API_KEY_PREFIX.length);
  return /^[a-zA-Z0-9_-]{24,128}$/.test(secretPart);
}

export function extractBearerApiKey(authHeader: string | string[] | undefined): string | null {
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (typeof raw !== 'string') return null;
  const match = raw.trim().match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const candidate = match[1].trim();
  return candidate.length > 0 ? candidate : null;
}

export function sanitizeApiKeyLabel(label: unknown): string {
  if (typeof label !== 'string') return 'Default API Key';
  const cleaned = label.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 60);
  return cleaned || 'Default API Key';
}

export function clampNonNegativeInt(value: unknown, fallback: number, max: number = 10_000_000): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(max, Math.floor(num)));
}

export function computeEffectiveDailyUsage(
  record: Pick<DeveloperApiKeyRecord, 'daily_limit' | 'daily_requests_used' | 'daily_usage_date'>,
  todayUtc: string = getUtcDateString()
): {
  usedToday: number;
  remainingToday: number;
} {
  const usedToday = record.daily_usage_date === todayUtc
    ? Math.max(0, Math.floor(Number(record.daily_requests_used) || 0))
    : 0;
  const limit = Math.max(0, Math.floor(Number(record.daily_limit) || 0));
  return {
    usedToday,
    remainingToday: Math.max(0, limit - usedToday)
  };
}

export function serializeDeveloperApiKey(
  record: DeveloperApiKeyRecord,
  todayUtc: string = getUtcDateString()
): PublicDeveloperApiKey {
  const { usedToday, remainingToday } = computeEffectiveDailyUsage(record, todayUtc);
  return {
    id: record.id,
    user_id: record.user_id,
    ...(record.user_name !== undefined && { user_name: record.user_name }),
    ...(record.user_email !== undefined && { user_email: record.user_email }),
    name: record.name,
    key_prefix: record.key_prefix,
    is_enabled: Boolean(record.is_enabled),
    credits: Math.max(0, Math.floor(Number(record.credits) || 0)),
    daily_limit: Math.max(0, Math.floor(Number(record.daily_limit) || 0)),
    daily_requests_used: usedToday,
    daily_remaining: remainingToday,
    daily_usage_date: todayUtc,
    total_requests: Math.max(0, Math.floor(Number(record.total_requests) || 0)),
    last_used_at: record.last_used_at || null,
    created_at: record.created_at,
    updated_at: record.updated_at
  };
}

export type QuotaCheckResult =
  | {
      allowed: true;
      usedToday: number;
      remainingTodayAfter: number;
      creditsAfter: number;
    }
  | {
      allowed: false;
      statusCode: 402 | 403 | 429;
      code: 'api_key_disabled' | 'account_suspended' | 'insufficient_quota' | 'rate_limit_exceeded';
      message: string;
    };

export function evaluateApiKeyQuota(
  record: Pick<DeveloperApiKeyRecord, 'is_enabled' | 'credits' | 'daily_limit' | 'daily_requests_used' | 'daily_usage_date'>,
  options: { userStatus?: 'active' | 'suspended'; todayUtc?: string } = {}
): QuotaCheckResult {
  if (options.userStatus === 'suspended') {
    return {
      allowed: false,
      statusCode: 403,
      code: 'account_suspended',
      message: 'The account associated with this API key has been suspended.'
    };
  }

  if (!record.is_enabled) {
    return {
      allowed: false,
      statusCode: 403,
      code: 'api_key_disabled',
      message: 'This API key is currently disabled by an administrator.'
    };
  }

  const credits = Math.max(0, Math.floor(Number(record.credits) || 0));
  if (credits < 1) {
    return {
      allowed: false,
      statusCode: 402,
      code: 'insufficient_quota',
      message: 'Insufficient API credits. Please contact support or top up your API credits to continue.'
    };
  }

  const todayUtc = options.todayUtc || getUtcDateString();
  const { usedToday } = computeEffectiveDailyUsage(record, todayUtc);
  const dailyLimit = Math.max(0, Math.floor(Number(record.daily_limit) || 0));

  if (dailyLimit <= 0 || usedToday >= dailyLimit) {
    return {
      allowed: false,
      statusCode: 429,
      code: 'rate_limit_exceeded',
      message: `Daily request limit reached (${usedToday}/${dailyLimit} requests today). Limit resets at 00:00 UTC.`
    };
  }

  return {
    allowed: true,
    usedToday,
    remainingTodayAfter: Math.max(0, dailyLimit - (usedToday + 1)),
    creditsAfter: credits - 1
  };
}

export interface SanitizedChatCompletionsRequest {
  requestedModel: string;
  openRouterModel: string;
  catalogModelId: string;
  stream: boolean;
  payload: Record<string, unknown>;
}

const ALLOWED_OPENAI_ROLES = new Set(['system', 'user', 'assistant', 'tool', 'developer']);

export function resolveDeveloperApiModel(
  requestedModel: string | undefined,
  enabledModels: AiModel[]
): { requestedModel: string; openRouterModel: string; catalogModelId: string } {
  const cleanRequested = typeof requestedModel === 'string' ? requestedModel.trim() : '';

  if (cleanRequested) {
    const normalized = cleanRequested.toLowerCase();
    const matched = enabledModels.find(
      (m) =>
        m.id.toLowerCase() === normalized ||
        m.model_name.toLowerCase() === normalized ||
        (m.openrouter_model_id && m.openrouter_model_id.toLowerCase() === normalized) ||
        m.display_name.toLowerCase() === normalized
    );

    if (matched) {
      const resolved = resolveOpenRouterModels(matched);
      return {
        requestedModel: cleanRequested,
        openRouterModel: resolved.primary,
        catalogModelId: matched.id
      };
    }

    // Allow direct OpenRouter model slugs like "openai/gpt-4o-mini" or "openrouter/free"
    if (/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:-]+$/.test(cleanRequested)) {
      return {
        requestedModel: cleanRequested,
        openRouterModel: cleanRequested,
        catalogModelId: cleanRequested
      };
    }
  }

  const defaultModel =
    enabledModels.find((m) => m.is_default) ||
    enabledModels[0];

  if (defaultModel) {
    const resolved = resolveOpenRouterModels(defaultModel);
    return {
      requestedModel: cleanRequested || defaultModel.model_name,
      openRouterModel: resolved.primary,
      catalogModelId: defaultModel.id
    };
  }

  return {
    requestedModel: cleanRequested || 'openrouter/free',
    openRouterModel: 'openrouter/free',
    catalogModelId: 'openrouter/free'
  };
}

export function sanitizeOpenAiChatCompletionsBody(
  body: unknown,
  enabledModels: AiModel[]
): { ok: true; data: SanitizedChatCompletionsRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }

  const input = body as Record<string, unknown>;
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    return { ok: false, error: '`messages` must be a non-empty array of chat messages.' };
  }
  if (input.messages.length > 200) {
    return { ok: false, error: '`messages` cannot contain more than 200 messages per request.' };
  }

  const sanitizedMessages: Array<Record<string, unknown>> = [];
  for (let i = 0; i < input.messages.length; i++) {
    const rawMsg = input.messages[i];
    if (!rawMsg || typeof rawMsg !== 'object' || Array.isArray(rawMsg)) {
      return { ok: false, error: `messages[${i}] must be an object.` };
    }
    const msg = rawMsg as Record<string, unknown>;
    const role = typeof msg.role === 'string' ? msg.role.trim().toLowerCase() : '';
    if (!ALLOWED_OPENAI_ROLES.has(role)) {
      return { ok: false, error: `messages[${i}].role must be one of system, user, assistant, tool, or developer.` };
    }
    const hasValidContent =
      typeof msg.content === 'string' ||
      Array.isArray(msg.content) ||
      msg.content === null;
    if (!hasValidContent) {
      return { ok: false, error: `messages[${i}].content must be a string or content array.` };
    }

    const cleanMsg: Record<string, unknown> = {
      role: role === 'developer' ? 'system' : role,
      content: msg.content
    };
    if (typeof msg.name === 'string' && msg.name.trim()) {
      cleanMsg.name = msg.name.trim().slice(0, 64);
    }
    if (typeof msg.tool_call_id === 'string' && msg.tool_call_id.trim()) {
      cleanMsg.tool_call_id = msg.tool_call_id.trim().slice(0, 128);
    }
    sanitizedMessages.push(cleanMsg);
  }

  const modelResolution = resolveDeveloperApiModel(
    typeof input.model === 'string' ? input.model : undefined,
    enabledModels
  );
  const stream = input.stream === true;

  const payload: Record<string, unknown> = {
    model: modelResolution.openRouterModel,
    messages: sanitizedMessages,
    stream
  };

  if (typeof input.temperature === 'number' && Number.isFinite(input.temperature)) {
    payload.temperature = Math.max(0, Math.min(2, input.temperature));
  }
  if (typeof input.top_p === 'number' && Number.isFinite(input.top_p)) {
    payload.top_p = Math.max(0, Math.min(1, input.top_p));
  }
  if (typeof input.max_tokens === 'number' && Number.isFinite(input.max_tokens) && input.max_tokens > 0) {
    payload.max_tokens = Math.min(16384, Math.floor(input.max_tokens));
  } else if (
    typeof input.max_completion_tokens === 'number' &&
    Number.isFinite(input.max_completion_tokens) &&
    input.max_completion_tokens > 0
  ) {
    payload.max_tokens = Math.min(16384, Math.floor(input.max_completion_tokens));
  }
  if (typeof input.presence_penalty === 'number' && Number.isFinite(input.presence_penalty)) {
    payload.presence_penalty = Math.max(-2, Math.min(2, input.presence_penalty));
  }
  if (typeof input.frequency_penalty === 'number' && Number.isFinite(input.frequency_penalty)) {
    payload.frequency_penalty = Math.max(-2, Math.min(2, input.frequency_penalty));
  }
  if (typeof input.stop === 'string') {
    payload.stop = input.stop;
  } else if (Array.isArray(input.stop) && input.stop.every((s) => typeof s === 'string')) {
    payload.stop = input.stop.slice(0, 4);
  }
  if (input.response_format && typeof input.response_format === 'object' && !Array.isArray(input.response_format)) {
    payload.response_format = input.response_format;
  }

  return {
    ok: true,
    data: {
      requestedModel: modelResolution.requestedModel,
      openRouterModel: modelResolution.openRouterModel,
      catalogModelId: modelResolution.catalogModelId,
      stream,
      payload
    }
  };
}

export function buildOpenAiErrorResponse(
  message: string,
  type: string = 'invalid_request_error',
  code: string | null = null
) {
  return {
    error: {
      message,
      type,
      param: null,
      code
    }
  };
}
