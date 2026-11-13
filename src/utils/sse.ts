export type ChatStreamEvent =
  | { kind: 'start'; chatId?: string }
  | { kind: 'chunk'; text: string }
  | { kind: 'done'; assistantMessage?: any; usageStats?: any }
  | { kind: 'error'; message: string }
  | { kind: 'ignore' };

/**
 * Buffers partial SSE chunks across stream reads and yields extracted `data:` payloads.
 */
export function createSseLineParser() {
  let buffer = '';

  const extractDataPayload = (rawLine: string): string | null => {
    const line = rawLine.replace(/\r$/, '');
    if (!line.startsWith('data:')) return null;
    return line.slice(5).trim();
  };

  return {
    feed(chunk: string): string[] {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      const payloads: string[] = [];
      for (const line of lines) {
        const payload = extractDataPayload(line);
        if (payload !== null && payload.length > 0) {
          payloads.push(payload);
        }
      }
      return payloads;
    },

    flush(): string[] {
      if (!buffer) return [];
      const payload = extractDataPayload(buffer);
      buffer = '';
      return payload !== null && payload.length > 0 ? [payload] : [];
    }
  };
}

/**
 * Parses a single SSE `data:` payload from `/api/chat/stream`.
 * Supports `{ type: 'chunk', text }`, legacy `{ chunk }`, `{ type: 'done', ... }`, and `{ type: 'error', error }`.
 */
export function parseChatStreamPayload(dataStr: string): ChatStreamEvent {
  const trimmed = dataStr.trim();
  if (!trimmed) return { kind: 'ignore' };
  if (trimmed === '[DONE]') return { kind: 'done' };

  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { kind: 'ignore' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { kind: 'ignore' };
  }

  if (parsed.type === 'error' || typeof parsed.error === 'string') {
    return {
      kind: 'error',
      message: parsed.error || 'Unknown streaming error occurred.'
    };
  }

  if (parsed.type === 'chunk') {
    const text = typeof parsed.text === 'string'
      ? parsed.text
      : (typeof parsed.chunk === 'string' ? parsed.chunk : '');
    return text ? { kind: 'chunk', text } : { kind: 'ignore' };
  }

  // Legacy / fallback chunk shapes
  if (typeof parsed.chunk === 'string' && parsed.chunk.length > 0) {
    return { kind: 'chunk', text: parsed.chunk };
  }
  if (typeof parsed.text === 'string' && parsed.text.length > 0 && !parsed.type) {
    return { kind: 'chunk', text: parsed.text };
  }

  if (parsed.type === 'done') {
    return {
      kind: 'done',
      assistantMessage: parsed.assistantMessage,
      usageStats: parsed.usageStats
    };
  }

  if (parsed.type === 'start') {
    return {
      kind: 'start',
      chatId: parsed.chatId
    };
  }

  return { kind: 'ignore' };
}
