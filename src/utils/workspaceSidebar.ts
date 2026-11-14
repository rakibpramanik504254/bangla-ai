import { AiModel, Chat } from '../types/index.ts';

export interface PartitionedChats {
  pinnedChats: Chat[];
  recentChats: Chat[];
}

export interface WorkspaceModelVisual {
  iconSrc: string;
  iconAlt: string;
  invertDark?: boolean;
}

function getUpdatedTimestampMs(chat: Chat): number {
  const parsed = Date.parse(chat.updated_at || chat.created_at || '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Filters chats by case-insensitive title search and partitions them into
 * Pinned and Recent lists, each ordered newest-updated first.
 */
export function partitionWorkspaceChats(
  chats: readonly Chat[],
  searchQuery: string
): PartitionedChats {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filtered = normalizedQuery
    ? chats.filter((chat) => (chat.title || '').toLowerCase().includes(normalizedQuery))
    : [...chats];

  const sorted = [...filtered].sort(
    (a, b) => getUpdatedTimestampMs(b) - getUpdatedTimestampMs(a)
  );

  const pinnedChats: Chat[] = [];
  const recentChats: Chat[] = [];

  for (const chat of sorted) {
    if (chat.pinned) {
      pinnedChats.push(chat);
    } else {
      recentChats.push(chat);
    }
  }

  return { pinnedChats, recentChats };
}

/**
 * Maps any workspace AI model record to its curated local brand SVG icon
 * in /assets/aistudio/ without using external URLs or broken paths.
 */
export function resolveWorkspaceModelVisual(
  model?: Pick<AiModel, 'id' | 'model_name' | 'display_name' | 'provider_id' | 'openrouter_model_id'> | null
): WorkspaceModelVisual | null {
  if (!model) return null;

  const fingerprint = [
    model.id,
    model.model_name,
    model.display_name,
    model.provider_id,
    model.openrouter_model_id || '',
  ]
    .join(' ')
    .toLowerCase();

  if (fingerprint.includes('claude') || fingerprint.includes('anthropic')) {
    return {
      iconSrc: '/assets/aistudio/calc-claude_2a15ea2f.svg',
      iconAlt: 'Anthropic Claude',
    };
  }
  if (fingerprint.includes('gemini') || fingerprint.includes('google') || fingerprint.includes('gemma')) {
    return {
      iconSrc: '/assets/aistudio/calc-gemini_221ee978.svg',
      iconAlt: 'Google Gemini',
    };
  }
  if (fingerprint.includes('gpt') || fingerprint.includes('openai') || fingerprint.includes('o1') || fingerprint.includes('o3') || fingerprint.includes('o4')) {
    return {
      iconSrc: '/assets/aistudio/calc-openai_c4f23f92.svg',
      iconAlt: 'OpenAI',
      invertDark: true,
    };
  }
  if (fingerprint.includes('grok') || fingerprint.includes('xai') || fingerprint.includes('x-ai')) {
    return {
      iconSrc: '/assets/aistudio/calc-grok_901d52d2.svg',
      iconAlt: 'xAI Grok',
      invertDark: true,
    };
  }
  if (fingerprint.includes('deepseek')) {
    return {
      iconSrc: '/assets/aistudio/calc-deepseek_729ceac7.svg',
      iconAlt: 'DeepSeek',
    };
  }
  if (fingerprint.includes('kimi') || fingerprint.includes('moonshot')) {
    return {
      iconSrc: '/assets/aistudio/calc-moonshot_e685cc14.svg',
      iconAlt: 'Moonshot Kimi',
      invertDark: true,
    };
  }
  if (fingerprint.includes('perplexity') || fingerprint.includes('sonar')) {
    return {
      iconSrc: '/assets/aistudio/calc-perplexity_9920b037.svg',
      iconAlt: 'Perplexity',
    };
  }

  return null;
}

/**
 * Formats compact remaining-token indicator for subtle workspace telemetry.
 */
export function formatCompactTokens(tokens: number): string {
  const safe = Math.max(0, Math.floor(tokens || 0));
  if (safe >= 1_000_000) {
    return `${(safe / 1_000_000).toFixed(safe % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (safe >= 1_000) {
    return `${(safe / 1_000).toFixed(safe >= 100_000 || safe % 1_000 === 0 ? 0 : 1)}K`;
  }
  return safe.toLocaleString();
}
