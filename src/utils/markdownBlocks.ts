export type MarkdownBlock =
  | { type: 'code'; language: string; code: string; isStreaming?: boolean }
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'hr' }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'paragraph'; text: string };

export type InlineSegment =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; label: string; href: string };

const LANGUAGE_EXTENSION_MAP: Record<string, string> = {
  ts: 'ts',
  typescript: 'ts',
  tsx: 'tsx',
  js: 'js',
  javascript: 'js',
  jsx: 'jsx',
  py: 'py',
  python: 'py',
  html: 'html',
  css: 'css',
  scss: 'scss',
  json: 'json',
  sh: 'sh',
  bash: 'sh',
  shell: 'sh',
  zsh: 'sh',
  sql: 'sql',
  postgres: 'sql',
  postgresql: 'sql',
  mysql: 'sql',
  yaml: 'yml',
  yml: 'yml',
  md: 'md',
  markdown: 'md',
  go: 'go',
  golang: 'go',
  rs: 'rs',
  rust: 'rs',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  php: 'php',
  rb: 'rb',
  ruby: 'rb',
  xml: 'xml'
};

export function getFileExtensionForLanguage(language: string): string {
  const key = (language || '').trim().toLowerCase();
  return LANGUAGE_EXTENSION_MAP[key] || 'txt';
}

export function getSuggestedFilename(language: string, index: number): string {
  const ext = getFileExtensionForLanguage(language);
  const cleanLang = (language || '').trim().toLowerCase();
  if (!cleanLang || cleanLang === 'code' || cleanLang === 'text' || cleanLang === 'txt') {
    return `snippet-${index + 1}.${ext}`;
  }
  return `snippet-${index + 1}.${ext}`;
}

function isTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  return /^\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?$/.test(trimmed);
}

function splitTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => cell.trim());
}

/**
 * Parses markdown content (including incomplete trailing code fences while streaming)
 * into structured UI blocks for IDE code editors, tables, lists, headings, quotes, and prose.
 */
export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip blank lines
    if (trimmed === '') {
      i++;
      continue;
    }

    // Fenced code block (supports streaming unclosed fences)
    const fenceMatch = trimmed.match(/^```([A-Za-z0-9_+.-]*)/);
    if (fenceMatch) {
      const language = fenceMatch[1] || 'code';
      const codeLines: string[] = [];
      i++;
      let closed = false;
      while (i < lines.length) {
        if (lines[i].trim().startsWith('```')) {
          closed = true;
          i++;
          break;
        }
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'code',
        language,
        code: codeLines.join('\n'),
        isStreaming: !closed
      });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // ATX Headings (# .. ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      blocks.push({ type: 'heading', level, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    // Markdown table (header line with | followed by separator line)
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparatorLine(lines[i + 1])
    ) {
      const headers = splitTableRow(lines[i]);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== '') {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', lines: quoteLines });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    // Paragraph (coalesce contiguous non-special lines or emit clean single-line paragraphs)
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const nextTrimmed = lines[i].trim();
      if (
        nextTrimmed === '' ||
        nextTrimmed.startsWith('```') ||
        /^#{1,4}\s+/.test(nextTrimmed) ||
        nextTrimmed.startsWith('>') ||
        /^[-*+]\s+/.test(nextTrimmed) ||
        /^\d+\.\s+/.test(nextTrimmed) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(nextTrimmed) ||
        (nextTrimmed.includes('|') && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1]))
      ) {
        break;
      }
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join('\n') });
  }

  return blocks;
}

/**
 * Parses inline markdown formatting (`code`, **bold**, *italic*, [label](url)).
 */
export function parseInlineSegments(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      segments.push({ type: 'code', value: token.slice(1, -1) });
    } else if (token.startsWith('**') && token.endsWith('**')) {
      segments.push({ type: 'bold', value: token.slice(2, -2) });
    } else if (token.startsWith('*') && token.endsWith('*')) {
      segments.push({ type: 'italic', value: token.slice(1, -1) });
    } else if (match[2] && match[3]) {
      segments.push({ type: 'link', label: match[2], href: match[3] });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

export function estimateReadingStats(text: string): { words: number; lines: number } {
  const trimmed = text.trim();
  if (!trimmed) return { words: 0, lines: 0 };
  const words = trimmed.split(/\s+/).length;
  const lines = trimmed.split('\n').length;
  return { words, lines };
}
