import type { ChatAttachment, ChatAttachmentFileType } from '../types/index.ts';

export const ACCEPTED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
]);

export const ACCEPTED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export const ACCEPTED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

export const ACCEPTED_DOCUMENT_EXTENSIONS = new Set(['.pdf', '.docx']);

export const ACCEPTED_TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.js',
  '.ts',
  '.py',
  '.html',
  '.css'
]);

export const CODE_ATTACHMENT_EXTENSIONS = new Set([
  '.json',
  '.js',
  '.ts',
  '.py',
  '.html',
  '.css'
]);

export const ATTACHMENT_IMAGE_ACCEPT = [
  'image/png',
  'image/jpeg',
  'image/webp',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp'
].join(',');

export const ATTACHMENT_DOCUMENT_ACCEPT = [
  '.pdf',
  'application/pdf',
  '.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt',
  '.csv',
  '.md',
  '.json',
  '.js',
  '.ts',
  '.py',
  '.html',
  '.css'
].join(',');

export const FILE_INPUT_ACCEPT = [
  ATTACHMENT_IMAGE_ACCEPT,
  ATTACHMENT_DOCUMENT_ACCEPT
].join(',');

export const MAX_ATTACHMENTS_PER_MESSAGE = 6;
export const MAX_IMAGE_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_TEXT_FILE_BYTES = 1 * 1024 * 1024; // 1 MB
export const MAX_DOCUMENT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB for PDF / DOCX
export const MAX_TEXT_CHARS_PER_FILE = 40000;
export const COMPOSER_MAX_HEIGHT_PX = 180;

export function getFileExtension(filename: string): string {
  const clean = filename.trim().toLowerCase();
  const dotIdx = clean.lastIndexOf('.');
  return dotIdx >= 0 ? clean.slice(dotIdx) : '';
}

export function isPdfAttachment(filename: string, mimeType: string = ''): boolean {
  const ext = getFileExtension(filename);
  const mime = mimeType.trim().toLowerCase();
  return ext === '.pdf' || mime === 'application/pdf';
}

export function isDocxAttachment(filename: string, mimeType: string = ''): boolean {
  const ext = getFileExtension(filename);
  const mime = mimeType.trim().toLowerCase();
  return (
    ext === '.docx' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}

export function requiresServerDocumentParsing(filename: string, mimeType: string = ''): boolean {
  return isPdfAttachment(filename, mimeType) || isDocxAttachment(filename, mimeType);
}

export function getAttachmentFileCategory(
  filename: string,
  mimeType: string = ''
): ChatAttachmentFileType {
  const ext = getFileExtension(filename);
  const mime = mimeType.trim().toLowerCase();

  if (ACCEPTED_IMAGE_MIME_TYPES.has(mime) || ACCEPTED_IMAGE_EXTENSIONS.has(ext)) {
    return 'image';
  }
  if (isPdfAttachment(filename, mime)) return 'pdf';
  if (isDocxAttachment(filename, mime)) return 'docx';
  if (ext === '.csv' || mime === 'text/csv') return 'csv';
  if (CODE_ATTACHMENT_EXTENSIONS.has(ext)) return 'code';
  return 'txt';
}

export function classifyAttachmentFile(file: {
  name: string;
  type?: string;
  size: number;
}): { ok: true; kind: 'image' | 'text' } | { ok: false; error: string } {
  const mime = (file.type || '').toLowerCase();
  const ext = getFileExtension(file.name || '');

  if (ACCEPTED_IMAGE_MIME_TYPES.has(mime) || ACCEPTED_IMAGE_EXTENSIONS.has(ext)) {
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      return {
        ok: false,
        error: `"${file.name}" exceeds the 8 MB image size limit.`
      };
    }
    return { ok: true, kind: 'image' };
  }

  if (requiresServerDocumentParsing(file.name || '', mime)) {
    if (file.size > MAX_DOCUMENT_FILE_BYTES) {
      return {
        ok: false,
        error: `"${file.name}" exceeds the 10 MB PDF/DOCX size limit.`
      };
    }
    return { ok: true, kind: 'text' };
  }

  if (ACCEPTED_TEXT_EXTENSIONS.has(ext)) {
    if (file.size > MAX_TEXT_FILE_BYTES) {
      return {
        ok: false,
        error: `"${file.name}" exceeds the 1 MB text/CSV file size limit.`
      };
    }
    return { ok: true, kind: 'text' };
  }

  return {
    ok: false,
    error: `Unsupported file "${file.name}". Allowed: PDF, DOCX, TXT, CSV, MD, Code files, and PNG, JPG, WEBP images.`
  };
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatAttachmentBadgeMeta(att: Pick<ChatAttachment, 'name' | 'mimeType' | 'size' | 'fileType' | 'pageCount'>): string {
  const category = att.fileType || getAttachmentFileCategory(att.name, att.mimeType);
  const sizeLabel = formatFileSize(att.size);
  if (category === 'pdf') {
    return att.pageCount && att.pageCount > 0
      ? `PDF · ${att.pageCount}p · ${sizeLabel}`
      : `PDF · ${sizeLabel}`;
  }
  if (category === 'docx') return `DOCX · ${sizeLabel}`;
  if (category === 'csv') return `CSV · ${sizeLabel}`;
  if (category === 'code') {
    const ext = getFileExtension(att.name).replace('.', '').toUpperCase() || 'CODE';
    return `${ext} · ${sizeLabel}`;
  }
  if (category === 'txt') {
    const ext = getFileExtension(att.name).replace('.', '').toUpperCase() || 'TXT';
    return `${ext} · ${sizeLabel}`;
  }
  return sizeLabel;
}

export function shouldComposerExpand(state: {
  isFocused: boolean;
  inputValue: string;
  attachmentCount: number;
  isToolbarMenuOpen?: boolean;
}): boolean {
  return Boolean(
    state.isFocused ||
    state.inputValue.trim().length > 0 ||
    state.attachmentCount > 0 ||
    state.isToolbarMenuOpen
  );
}

export function clampComposerHeight(scrollHeight: number, maxHeight: number = COMPOSER_MAX_HEIGHT_PX): {
  heightPx: number;
  overflowY: 'hidden' | 'auto';
} {
  const safeScroll = Math.max(0, Math.round(scrollHeight));
  if (safeScroll > maxHeight) {
    return { heightPx: maxHeight, overflowY: 'auto' };
  }
  return { heightPx: safeScroll, overflowY: 'hidden' };
}

export function buildTextAttachmentPromptBlock(attachments: ChatAttachment[]): string {
  const textFiles = attachments.filter(a => a.kind === 'text' && typeof a.textContent === 'string');
  if (textFiles.length === 0) return '';

  return textFiles
    .map(file => {
      const content = (file.textContent || '').slice(0, MAX_TEXT_CHARS_PER_FILE);
      const truncatedNotice =
        (file.textContent || '').length > MAX_TEXT_CHARS_PER_FILE ? '\n[...truncated...]' : '';
      const pageMeta = file.pageCount && file.pageCount > 0 ? ` (${file.pageCount} pages)` : '';
      return `[Attached File: ${file.name}]${pageMeta}\n\`\`\`\n${content}${truncatedNotice}\n\`\`\``;
    })
    .join('\n\n');
}

const VALID_FILE_TYPES = new Set<ChatAttachmentFileType>([
  'image',
  'pdf',
  'docx',
  'csv',
  'txt',
  'code'
]);

export function sanitizeIncomingAttachments(raw: unknown): ChatAttachment[] {
  if (!Array.isArray(raw)) return [];
  const clean: ChatAttachment[] = [];

  for (const item of raw.slice(0, MAX_ATTACHMENTS_PER_MESSAGE)) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 180) : '';
    const mimeType = typeof obj.mimeType === 'string' ? obj.mimeType.trim().slice(0, 120) : '';
    const size = typeof obj.size === 'number' && Number.isFinite(obj.size) ? Math.max(0, obj.size) : 0;
    const kind = obj.kind === 'image' || obj.kind === 'text' ? obj.kind : null;

    if (!name || !kind) continue;

    const rawFileType = typeof obj.fileType === 'string' ? obj.fileType as ChatAttachmentFileType : undefined;
    const safeFileType: ChatAttachmentFileType =
      rawFileType && VALID_FILE_TYPES.has(rawFileType)
        ? rawFileType
        : getAttachmentFileCategory(name, mimeType);
    const pageCount =
      typeof obj.pageCount === 'number' && Number.isInteger(obj.pageCount) && obj.pageCount > 0
        ? obj.pageCount
        : undefined;

    if (kind === 'image') {
      const dataUrl = typeof obj.dataUrl === 'string' ? obj.dataUrl : '';
      if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(dataUrl)) {
        continue;
      }
      clean.push({
        id: typeof obj.id === 'string' && obj.id ? obj.id : `att_${clean.length + 1}`,
        name,
        mimeType: mimeType || 'image/png',
        size,
        kind: 'image',
        fileType: 'image',
        dataUrl
      });
    } else {
      const textContent = typeof obj.textContent === 'string' ? obj.textContent.slice(0, MAX_TEXT_CHARS_PER_FILE) : '';
      clean.push({
        id: typeof obj.id === 'string' && obj.id ? obj.id : `att_${clean.length + 1}`,
        name,
        mimeType: mimeType || 'text/plain',
        size,
        kind: 'text',
        fileType: safeFileType === 'image' ? 'txt' : safeFileType,
        ...(pageCount ? { pageCount } : {}),
        textContent
      });
    }
  }

  return clean;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error(`Could not read "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

export function readFileAsBase64(file: File): Promise<string> {
  return readFileAsDataUrl(file).then((dataUrl) => {
    const commaIdx = dataUrl.indexOf(',');
    return commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error(`Could not read file "${file.name}".`));
    reader.readAsText(file, 'utf-8');
  });
}

export interface ParsedDocumentResponse {
  textContent: string;
  pageCount?: number;
  mimeType?: string;
  fileType?: ChatAttachmentFileType;
}

export async function processSelectedFiles(
  files: File[],
  existingCount: number = 0,
  options?: {
    parseDocument?: (file: File) => Promise<ParsedDocumentResponse>;
  }
): Promise<{ attachments: ChatAttachment[]; errors: string[] }> {
  const attachments: ChatAttachment[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (existingCount + attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
      errors.push(`Maximum ${MAX_ATTACHMENTS_PER_MESSAGE} attachments allowed per message.`);
      break;
    }

    const validation = classifyAttachmentFile(file);
    if (!validation.ok) {
      errors.push(validation.error);
      continue;
    }

    try {
      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? `att_${crypto.randomUUID().slice(0, 8)}`
          : `att_${Date.now()}_${attachments.length}`;

      if (validation.kind === 'image') {
        const dataUrl = await readFileAsDataUrl(file);
        attachments.push({
          id,
          name: file.name || 'pasted-image.png',
          mimeType: file.type || 'image/png',
          size: file.size,
          kind: 'image',
          fileType: 'image',
          dataUrl
        });
      } else if (requiresServerDocumentParsing(file.name, file.type)) {
        if (!options?.parseDocument) {
          errors.push(`Document parser is unavailable for "${file.name}".`);
          continue;
        }
        const parsed = await options.parseDocument(file);
        attachments.push({
          id,
          name: file.name,
          mimeType:
            parsed.mimeType ||
            file.type ||
            (isPdfAttachment(file.name, file.type)
              ? 'application/pdf'
              : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
          size: file.size,
          kind: 'text',
          fileType: parsed.fileType || getAttachmentFileCategory(file.name, file.type),
          ...(parsed.pageCount && parsed.pageCount > 0 ? { pageCount: parsed.pageCount } : {}),
          textContent: (parsed.textContent || '').slice(0, MAX_TEXT_CHARS_PER_FILE)
        });
      } else {
        const textContent = (await readFileAsText(file)).slice(0, MAX_TEXT_CHARS_PER_FILE);
        attachments.push({
          id,
          name: file.name,
          mimeType: file.type || 'text/plain',
          size: file.size,
          kind: 'text',
          fileType: getAttachmentFileCategory(file.name, file.type),
          textContent
        });
      }
    } catch (err: any) {
      errors.push(err?.message || `Failed to read "${file.name}".`);
    }
  }

  return { attachments, errors };
}
