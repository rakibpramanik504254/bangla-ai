import { parseMarkdownBlocks, type MarkdownBlock } from './markdownBlocks.ts';

export type StructuredDocumentKind = 'presentation' | 'cv' | 'report' | 'none';

export interface DocumentExportDetection {
  hasStructuredDoc: boolean;
  kind: StructuredDocumentKind;
  title: string;
  sectionCount: number;
  slideCount: number;
}

export interface ExportSlide {
  slideNumber: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  bodyParagraphs: string[];
  tables: Array<{ headers: string[]; rows: string[][] }>;
}

export interface ParsedDocumentExport {
  title: string;
  fileSlug: string;
  kind: StructuredDocumentKind;
  blocks: MarkdownBlock[];
  slides: ExportSlide[];
}

export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^>\s?/gm, '')
    .trim();
}

export function slugifyFilename(title: string, fallback: string = 'bangla-ai-document'): string {
  const ascii = stripInlineMarkdown(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 56)
    .replace(/^-|-$/g, '');
  return ascii || fallback;
}

function isSlideHeading(text: string): boolean {
  return /^(?:slide|স্লাইড)\s*\d*\s*[:.\-–—]?/i.test(stripInlineMarkdown(text));
}

function cleanSlideTitle(text: string): string {
  return stripInlineMarkdown(text)
    .replace(/^(?:slide|স্লাইড)\s*\d+\s*[:.\-–—]\s*/i, '')
    .trim();
}

function splitBlocksIntoChunks(blocks: MarkdownBlock[], maxBulletsPerSlide: number = 6): ExportSlide[] {
  if (blocks.length === 0) return [];

  // 1. Check if content explicitly uses HR (`---`) dividers or `Slide N:` headings
  const hasHrDividers = blocks.filter((b) => b.type === 'hr').length >= 1;
  const headingBlocks = blocks.filter((b) => b.type === 'heading');
  const hasExplicitSlideHeadings = headingBlocks.filter((b) => b.type === 'heading' && isSlideHeading(b.text)).length >= 2;

  type SectionBucket = {
    title: string;
    subtitle?: string;
    bullets: string[];
    bodyParagraphs: string[];
    tables: Array<{ headers: string[]; rows: string[][] }>;
  };

  const buckets: SectionBucket[] = [];
  let current: SectionBucket | null = null;

  const ensureBucket = (defaultTitle: string) => {
    if (!current) {
      current = {
        title: defaultTitle,
        bullets: [],
        bodyParagraphs: [],
        tables: [],
      };
      buckets.push(current);
    }
    return current;
  };

  if (hasHrDividers || hasExplicitSlideHeadings) {
    for (const block of blocks) {
      if (block.type === 'hr') {
        current = null;
        continue;
      }
      if (block.type === 'heading') {
        const cleaned = cleanSlideTitle(block.text);
        if (
          isSlideHeading(block.text) ||
          !current ||
          block.level <= 2 ||
          (current.bullets.length > 0 || current.bodyParagraphs.length > 0 || current.tables.length > 0)
        ) {
          current = {
            title: cleaned || stripInlineMarkdown(block.text),
            bullets: [],
            bodyParagraphs: [],
            tables: [],
          };
          buckets.push(current);
        } else if (!current.subtitle) {
          current.subtitle = cleaned;
        }
        continue;
      }

      const bucket = ensureBucket('Overview');
      if (block.type === 'list') {
        for (const item of block.items) {
          const cleanItem = stripInlineMarkdown(item);
          if (cleanItem) bucket.bullets.push(cleanItem);
        }
      } else if (block.type === 'paragraph') {
        const cleanPara = stripInlineMarkdown(block.text);
        if (cleanPara) {
          if (!bucket.subtitle && bucket.bodyParagraphs.length === 0 && bucket.bullets.length === 0 && cleanPara.length <= 120) {
            bucket.subtitle = cleanPara;
          } else {
            bucket.bodyParagraphs.push(cleanPara);
          }
        }
      } else if (block.type === 'blockquote') {
        const quote = block.lines.map(stripInlineMarkdown).filter(Boolean).join(' ');
        if (quote) bucket.bodyParagraphs.push(quote);
      } else if (block.type === 'table') {
        bucket.tables.push({
          headers: block.headers.map(stripInlineMarkdown),
          rows: block.rows.map((r) => r.map(stripInlineMarkdown)),
        });
      } else if (block.type === 'code') {
        bucket.bodyParagraphs.push(block.code);
      }
    }
  } else {
    // 2. General structured report / CV: group by headings (H1..H3)
    for (const block of blocks) {
      if (block.type === 'heading') {
        const title = stripInlineMarkdown(block.text);
        if (
          current &&
          current.bullets.length === 0 &&
          current.bodyParagraphs.length === 0 &&
          current.tables.length === 0 &&
          block.level > 1 &&
          !current.subtitle
        ) {
          current.subtitle = title;
        } else {
          current = {
            title,
            bullets: [],
            bodyParagraphs: [],
            tables: [],
          };
          buckets.push(current);
        }
        continue;
      }

      const bucket = ensureBucket('Summary');
      if (block.type === 'list') {
        for (const item of block.items) {
          const cleanItem = stripInlineMarkdown(item);
          if (cleanItem) bucket.bullets.push(cleanItem);
        }
      } else if (block.type === 'paragraph') {
        const cleanPara = stripInlineMarkdown(block.text);
        if (cleanPara) bucket.bodyParagraphs.push(cleanPara);
      } else if (block.type === 'blockquote') {
        const quote = block.lines.map(stripInlineMarkdown).filter(Boolean).join(' ');
        if (quote) bucket.bodyParagraphs.push(quote);
      } else if (block.type === 'table') {
        bucket.tables.push({
          headers: block.headers.map(stripInlineMarkdown),
          rows: block.rows.map((r) => r.map(stripInlineMarkdown)),
        });
      } else if (block.type === 'code') {
        bucket.bodyParagraphs.push(block.code);
      }
    }
  }

  // Filter empty buckets & paginate long bullet lists cleanly across slides
  const finalSlides: ExportSlide[] = [];
  for (const bucket of buckets) {
    const hasContent =
      Boolean(bucket.title) &&
      (bucket.bullets.length > 0 ||
        bucket.bodyParagraphs.length > 0 ||
        bucket.tables.length > 0 ||
        Boolean(bucket.subtitle));
    if (!hasContent) continue;

    if (bucket.bullets.length <= maxBulletsPerSlide) {
      finalSlides.push({
        slideNumber: finalSlides.length + 1,
        title: bucket.title,
        ...(bucket.subtitle ? { subtitle: bucket.subtitle } : {}),
        bullets: bucket.bullets,
        bodyParagraphs: bucket.bodyParagraphs,
        tables: bucket.tables,
      });
    } else {
      for (let i = 0; i < bucket.bullets.length; i += maxBulletsPerSlide) {
        const chunk = bucket.bullets.slice(i, i + maxBulletsPerSlide);
        const isFirst = i === 0;
        finalSlides.push({
          slideNumber: finalSlides.length + 1,
          title: isFirst ? bucket.title : `${bucket.title} (Cont.)`,
          ...(isFirst && bucket.subtitle ? { subtitle: bucket.subtitle } : {}),
          bullets: chunk,
          bodyParagraphs: isFirst ? bucket.bodyParagraphs : [],
          tables: isFirst ? bucket.tables : [],
        });
      }
    }
  }

  return finalSlides;
}

export function detectExportableDocument(
  content: string,
  fallbackTitle: string = 'Bangla AI Document'
): DocumentExportDetection {
  const trimmed = (content || '').trim();
  if (!trimmed || trimmed.startsWith('⚠️ Error:') || trimmed.length < 120) {
    return {
      hasStructuredDoc: false,
      kind: 'none',
      title: fallbackTitle,
      sectionCount: 0,
      slideCount: 0,
    };
  }

  const blocks = parseMarkdownBlocks(trimmed);
  const headings = blocks.filter((b): b is Extract<MarkdownBlock, { type: 'heading' }> => b.type === 'heading');
  const lists = blocks.filter((b) => b.type === 'list');
  const tables = blocks.filter((b) => b.type === 'table');
  const hrs = blocks.filter((b) => b.type === 'hr');
  const codeBlocks = blocks.filter((b) => b.type === 'code');

  const slideHeadingCount = headings.filter((h) => isSlideHeading(h.text)).length;
  const nonCodeTextLength = blocks
    .filter((b) => b.type !== 'code')
    .map((b) => {
      if (b.type === 'heading' || b.type === 'paragraph') return b.text.length;
      if (b.type === 'list') return b.items.join(' ').length;
      if (b.type === 'blockquote') return b.lines.join(' ').length;
      if (b.type === 'table') return b.headers.join(' ').length + b.rows.flat().join(' ').length;
      return 0;
    })
    .reduce((acc, n) => acc + n, 0);

  // Exclude pure code-only snippets with a tiny intro line
  if (codeBlocks.length > 0 && headings.length < 2 && nonCodeTextLength < 220) {
    return {
      hasStructuredDoc: false,
      kind: 'none',
      title: fallbackTitle,
      sectionCount: 0,
      slideCount: 0,
    };
  }

  const hasPresentationSignals =
    slideHeadingCount >= 2 ||
    (hrs.length >= 2 && headings.length >= 2) ||
    (headings.length >= 3 && /\b(slide\s*\d+|presentation|pitch\s*deck|keynote|agenda)\b/i.test(trimmed));

  const lower = trimmed.toLowerCase();
  const hasCvSignals =
    headings.length >= 2 &&
    (/\b(curriculum vitae|resume|work experience|professional experience|education|skills|career objective|certifications)\b/i.test(lower) ||
      (/experience/i.test(lower) && /education/i.test(lower)));

  const hasReportSignals =
    headings.length >= 2 ||
    (headings.length >= 1 && (lists.length >= 1 || tables.length >= 1) && nonCodeTextLength >= 260) ||
    (tables.length >= 1 && nonCodeTextLength >= 220);

  if (!hasPresentationSignals && !hasCvSignals && !hasReportSignals) {
    return {
      hasStructuredDoc: false,
      kind: 'none',
      title: fallbackTitle,
      sectionCount: headings.length,
      slideCount: 0,
    };
  }

  const firstHeading = headings[0]?.text ? cleanSlideTitle(headings[0].text) : '';
  const resolvedTitle = firstHeading || fallbackTitle;
  const slides = splitBlocksIntoChunks(blocks);
  const kind: StructuredDocumentKind = hasPresentationSignals
    ? 'presentation'
    : hasCvSignals
      ? 'cv'
      : 'report';

  return {
    hasStructuredDoc: true,
    kind,
    title: resolvedTitle,
    sectionCount: Math.max(headings.length, slides.length),
    slideCount: Math.max(1, slides.length),
  };
}

export function parseDocumentForExport(
  content: string,
  fallbackTitle: string = 'Bangla AI Document'
): ParsedDocumentExport {
  const detection = detectExportableDocument(content, fallbackTitle);
  const blocks = parseMarkdownBlocks(content || '');
  let slides = splitBlocksIntoChunks(blocks);

  if (slides.length === 0 && content.trim()) {
    slides = [
      {
        slideNumber: 1,
        title: detection.title,
        bullets: [],
        bodyParagraphs: [stripInlineMarkdown(content)],
        tables: [],
      },
    ];
  }

  return {
    title: detection.title,
    fileSlug: slugifyFilename(detection.title),
    kind: detection.kind === 'none' ? 'report' : detection.kind,
    blocks,
    slides,
  };
}
