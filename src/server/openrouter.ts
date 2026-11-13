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

export function isValidApiKey(key?: string | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
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

export function buildOpenRouterRequestBody(
  openRouterModelId: string,
  messages: { role: string; content: string }[],
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
        content: m.content
      }))
    ]
  };
}

export interface OpenRouterParsedLine {
  textDelta?: string;
  done?: boolean;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
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
  const delta = parsed?.choices?.[0]?.delta;
  if (typeof delta?.content === 'string' && delta.content.length > 0) {
    result.textDelta = delta.content;
  } else if (typeof delta?.reasoning === 'string' && delta.reasoning.length > 0 && !delta?.content) {
    // Do not leak raw chain-of-thought reasoning unless needed; wait for content chunks
  }

  if (parsed?.usage) {
    result.usage = {
      promptTokens: Number(parsed.usage.prompt_tokens) || 0,
      completionTokens: Number(parsed.usage.completion_tokens) || 0
    };
  }

  return result;
}
