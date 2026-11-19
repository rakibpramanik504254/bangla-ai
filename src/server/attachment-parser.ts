import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import {
  ACCEPTED_TEXT_EXTENSIONS,
  MAX_DOCUMENT_FILE_BYTES,
  MAX_TEXT_CHARS_PER_FILE,
  MAX_TEXT_FILE_BYTES,
  getAttachmentFileCategory,
  getFileExtension,
  isDocxAttachment,
  isPdfAttachment
} from '../utils/chatAttachments.ts';
import type { ChatAttachmentFileType } from '../types/index.ts';

export class AttachmentParseError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'AttachmentParseError';
    this.statusCode = statusCode;
  }
}

export interface ParsedAttachmentResult {
  name: string;
  mimeType: string;
  size: number;
  kind: 'text';
  fileType: ChatAttachmentFileType;
  pageCount?: number;
  textContent: string;
  truncated: boolean;
}

export function normalizeExtractedDocumentText(rawText: string): string {
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function decodeBase64Payload(dataBase64: string): Buffer {
  const clean = dataBase64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  if (!clean) {
    throw new AttachmentParseError('Uploaded file content is empty.', 400);
  }
  return Buffer.from(clean, 'base64');
}

export async function parseAttachmentBuffer(params: {
  name: string;
  mimeType?: string;
  buffer: Buffer;
}): Promise<ParsedAttachmentResult> {
  const cleanName = (params.name || '').trim().slice(0, 180);
  if (!cleanName) {
    throw new AttachmentParseError('File name is required.', 400);
  }

  const mime = (params.mimeType || '').trim();
  const ext = getFileExtension(cleanName);
  const size = params.buffer.length;

  if (size <= 0) {
    throw new AttachmentParseError(`"${cleanName}" is empty.`, 400);
  }

  const isPdf = isPdfAttachment(cleanName, mime);
  const isDocx = isDocxAttachment(cleanName, mime);
  const isPlainText = ACCEPTED_TEXT_EXTENSIONS.has(ext);

  if (!isPdf && !isDocx && !isPlainText) {
    throw new AttachmentParseError(
      `Unsupported document format for "${cleanName}". Supported formats: PDF, DOCX, TXT, CSV, MD, and code files.`,
      400
    );
  }

  if ((isPdf || isDocx) && size > MAX_DOCUMENT_FILE_BYTES) {
    throw new AttachmentParseError(`"${cleanName}" exceeds the 10 MB document size limit.`, 400);
  }

  if (isPlainText && size > MAX_TEXT_FILE_BYTES) {
    throw new AttachmentParseError(`"${cleanName}" exceeds the 1 MB text file size limit.`, 400);
  }

  let extractedText = '';
  let pageCount: number | undefined;
  let resolvedMime = mime;

  if (isPdf) {
    resolvedMime = resolvedMime || 'application/pdf';
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: new Uint8Array(params.buffer) });
      const textResult = await parser.getText();
      extractedText = normalizeExtractedDocumentText(textResult?.text || '');
      if (typeof textResult?.total === 'number' && textResult.total > 0) {
        pageCount = textResult.total;
      } else if (Array.isArray(textResult?.pages) && textResult.pages.length > 0) {
        pageCount = textResult.pages.length;
      }
    } catch (err: any) {
      throw new AttachmentParseError(
        `Could not read PDF "${cleanName}". Ensure it is a valid, unencrypted PDF file.`,
        422
      );
    } finally {
      if (parser) {
        await parser.destroy().catch(() => {});
      }
    }

    if (!extractedText) {
      throw new AttachmentParseError(
        `No selectable text was found in "${cleanName}". Scanned image-only PDFs cannot be extracted as text yet.`,
        422
      );
    }
  } else if (isDocx) {
    resolvedMime =
      resolvedMime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    try {
      const result = await mammoth.extractRawText({ buffer: params.buffer });
      extractedText = normalizeExtractedDocumentText(result?.value || '');
    } catch {
      throw new AttachmentParseError(
        `Could not read Word document "${cleanName}". Ensure it is a valid .docx file.`,
        422
      );
    }

    if (!extractedText) {
      throw new AttachmentParseError(`"${cleanName}" contains no readable text content.`, 422);
    }
  } else {
    resolvedMime = resolvedMime || (ext === '.csv' ? 'text/csv' : 'text/plain');
    extractedText = normalizeExtractedDocumentText(params.buffer.toString('utf-8'));
  }

  const truncated = extractedText.length > MAX_TEXT_CHARS_PER_FILE;
  const finalContent = truncated
    ? extractedText.slice(0, MAX_TEXT_CHARS_PER_FILE)
    : extractedText;

  return {
    name: cleanName,
    mimeType: resolvedMime,
    size,
    kind: 'text',
    fileType: getAttachmentFileCategory(cleanName, resolvedMime),
    ...(pageCount ? { pageCount } : {}),
    textContent: finalContent,
    truncated
  };
}

export async function parseAttachmentPayload(payload: {
  name?: unknown;
  mimeType?: unknown;
  dataBase64?: unknown;
}): Promise<ParsedAttachmentResult> {
  const name = typeof payload.name === 'string' ? payload.name : '';
  const mimeType = typeof payload.mimeType === 'string' ? payload.mimeType : '';
  const dataBase64 = typeof payload.dataBase64 === 'string' ? payload.dataBase64 : '';

  if (!dataBase64) {
    throw new AttachmentParseError('Encoded file payload (dataBase64) is required.', 400);
  }

  const buffer = decodeBase64Payload(dataBase64);
  return parseAttachmentBuffer({ name, mimeType, buffer });
}
