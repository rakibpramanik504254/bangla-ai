import type { UserMemory, UserMemoryCategory } from '../types/index.ts';

export const MAX_MEMORIES_PER_USER = 60;
export const MAX_MEMORY_CONTENT_CHARS = 500;
export const MIN_MEMORY_CONTENT_CHARS = 3;

const VALID_CATEGORIES = new Set<UserMemoryCategory>([
  'preference',
  'instruction',
  'context',
  'profile'
]);

export function normalizeMemoryCategory(raw: unknown): UserMemoryCategory {
  if (typeof raw === 'string') {
    const clean = raw.trim().toLowerCase() as UserMemoryCategory;
    if (VALID_CATEGORIES.has(clean)) {
      return clean;
    }
  }
  return 'context';
}

export function normalizeMemoryContent(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/\r\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MEMORY_CONTENT_CHARS);
}

export function formatMemoryCategoryLabel(category: UserMemoryCategory): string {
  switch (category) {
    case 'preference':
      return 'Preference';
    case 'instruction':
      return 'Instruction';
    case 'profile':
      return 'Profile';
    default:
      return 'Context';
  }
}

export interface ExtractedMemoryDirective {
  category: UserMemoryCategory;
  content: string;
}

/**
 * Builds the Persistent Memory system-prompt appendix injected across all chat sessions.
 */
export function buildMemorySystemPromptBlock(memories: UserMemory[]): string {
  const activeLines = memories
    .slice(0, 40)
    .map((m) => `- [${formatMemoryCategoryLabel(m.category)}] ${m.content}`);

  const savedSection =
    activeLines.length > 0
      ? `\n\n[User Persistent Memory — Apply Across All Sessions]\n${activeLines.join('\n')}`
      : '';

  const savingInstructions = `\n\n[Memory Persistence Capability]
If the user explicitly asks you to remember something (e.g., "Remember that...", "Always...", "Keep in mind...", "মনে রেখো...") OR states an enduring personal preference, role, project stack, or standing instruction useful in future sessions, append a concise directive at the very end of your response using this exact syntax (and confirm naturally to the user):
[[MEMORY:category|concise standalone fact]]
Valid categories: preference, instruction, context, profile.
Only emit [[MEMORY:...]] when the user shares persistent preferences, instructions, role/profile details, or lasting project context — never emit it for one-off questions.`;

  return `${savedSection}${savingInstructions}`;
}

const MEMORY_DIRECTIVE_REGEX = /\[\[MEMORY\s*:\s*([a-zA-Z]+)\s*\|\s*([^\]]+?)\s*\]\]/g;

/**
 * Extracts `[[MEMORY:category|fact]]` directives from an assistant reply and returns clean visible text.
 */
export function parseMemoryDirectivesFromResponse(text: string): {
  visibleText: string;
  extractedMemories: ExtractedMemoryDirective[];
} {
  const extractedMemories: ExtractedMemoryDirective[] = [];
  const seen = new Set<string>();

  const visibleRaw = text.replace(MEMORY_DIRECTIVE_REGEX, (_full, rawCat, rawFact) => {
    const content = normalizeMemoryContent(rawFact);
    if (content.length >= MIN_MEMORY_CONTENT_CHARS) {
      const key = content.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        extractedMemories.push({
          category: normalizeMemoryCategory(rawCat),
          content
        });
      }
    }
    return '';
  });

  const visibleText = visibleRaw.replace(/\n{3,}/g, '\n\n').trimEnd();
  return { visibleText, extractedMemories };
}

/**
 * Incremental streaming filter that strips `[[MEMORY:...]]` tags before sending SSE chunks to clients,
 * holding back only potential incomplete `[[` tag prefixes at chunk boundaries.
 */
export function createStreamingMemoryFilter() {
  let pending = '';
  const extracted: ExtractedMemoryDirective[] = [];
  const seen = new Set<string>();

  const recordDirectives = (chunk: string): string => {
    return chunk.replace(MEMORY_DIRECTIVE_REGEX, (_full, rawCat, rawFact) => {
      const content = normalizeMemoryContent(rawFact);
      if (content.length >= MIN_MEMORY_CONTENT_CHARS) {
        const key = content.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          extracted.push({
            category: normalizeMemoryCategory(rawCat),
            content
          });
        }
      }
      return '';
    });
  };

  return {
    push(delta: string): string {
      pending += delta;
      const cleaned = recordDirectives(pending);

      // Hold back any trailing partial `[[` marker that could complete into `[[MEMORY:...]]`
      const openIdx = cleaned.lastIndexOf('[[');
      if (openIdx >= 0 && !cleaned.slice(openIdx).includes(']]')) {
        const safeOut = cleaned.slice(0, openIdx);
        pending = cleaned.slice(openIdx);
        return safeOut;
      }

      // Also hold back a single trailing `[` right at the end of a chunk in case next char is `[`
      if (cleaned.endsWith('[')) {
        pending = '[';
        return cleaned.slice(0, -1);
      }

      pending = '';
      return cleaned;
    },

    flush(): { remainingText: string; extractedMemories: ExtractedMemoryDirective[] } {
      const cleaned = recordDirectives(pending);
      pending = '';
      return {
        remainingText: cleaned,
        extractedMemories: [...extracted]
      };
    }
  };
}

/**
 * Deterministic fallback extractor for explicit user prompts such as:
 * "Remember that I prefer concise TypeScript examples" or "মনে রেখো আমি ঢাকার একজন ফাউন্ডার".
 */
export function extractExplicitMemoryFromUserPrompt(prompt: string): ExtractedMemoryDirective[] {
  const trimmed = (prompt || '').trim();
  if (!trimmed || trimmed.length > 600) return [];

  const results: ExtractedMemoryDirective[] = [];

  const patterns: Array<{ regex: RegExp; category: UserMemoryCategory; prefix?: string }> = [
    {
      regex: /^(?:please\s+)?remember\s+(?:that\s+)?(.+)/i,
      category: 'instruction'
    },
    {
      regex: /^(?:please\s+)?keep\s+in\s+mind\s+(?:that\s+)?(.+)/i,
      category: 'context'
    },
    {
      regex: /^from\s+now\s+on[,:\s]+(.+)/i,
      category: 'instruction'
    },
    {
      regex: /^always\s+(?:reply|respond|answer|write|use)\s+(.+)/i,
      category: 'preference',
      prefix: 'Always '
    },
    {
      regex: /^(?:অনুগ্রহ\s+করে\s+)?(?:মনে\s+রেখো|মনে\s+রাখবে|মনে\s+রাখবেন)\s*(?:যে\s+)?(.+)/i,
      category: 'instruction'
    }
  ];

  for (const spec of patterns) {
    const match = trimmed.match(spec.regex);
    if (match && match[1]) {
      const rawBody = spec.prefix
        ? `${spec.prefix}${trimmed.replace(/^always\s+/i, '')}`
        : match[1];
      const cleaned = normalizeMemoryContent(rawBody.replace(/[.!]+$/, ''));
      if (cleaned.length >= 6) {
        results.push({
          category: spec.category,
          content: cleaned
        });
        break;
      }
    }
  }

  return results;
}
