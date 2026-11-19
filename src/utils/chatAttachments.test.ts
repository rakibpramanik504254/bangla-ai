import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyAttachmentFile,
  formatFileSize,
  formatAttachmentBadgeMeta,
  getAttachmentFileCategory,
  requiresServerDocumentParsing,
  shouldComposerExpand,
  clampComposerHeight,
  buildTextAttachmentPromptBlock,
  sanitizeIncomingAttachments
} from './chatAttachments.ts';

test('classifyAttachmentFile accepts supported images, documents (PDF/DOCX), CSV, and code files and rejects unsupported/oversized ones', () => {
  assert.deepEqual(classifyAttachmentFile({ name: 'photo.png', type: 'image/png', size: 1024 }), {
    ok: true,
    kind: 'image'
  });
  assert.deepEqual(classifyAttachmentFile({ name: 'pic.JPG', type: 'image/jpeg', size: 2048 }), {
    ok: true,
    kind: 'image'
  });
  assert.deepEqual(classifyAttachmentFile({ name: 'shot.webp', type: '', size: 4096 }), {
    ok: true,
    kind: 'image'
  });

  for (const ext of ['.txt', '.md', '.csv', '.json', '.js', '.ts', '.py', '.html', '.css', '.pdf', '.docx']) {
    assert.deepEqual(classifyAttachmentFile({ name: `sample${ext}`, type: '', size: 512 }), {
      ok: true,
      kind: 'text'
    });
  }

  // PDF/DOCX up to 10 MB allowed
  assert.deepEqual(
    classifyAttachmentFile({ name: 'report.pdf', type: 'application/pdf', size: 5 * 1024 * 1024 }),
    { ok: true, kind: 'text' }
  );
  const bigPdf = classifyAttachmentFile({
    name: 'huge.pdf',
    type: 'application/pdf',
    size: 11 * 1024 * 1024
  });
  assert.equal(bigPdf.ok, false);

  const badType = classifyAttachmentFile({ name: 'malware.exe', type: 'application/octet-stream', size: 100 });
  assert.equal(badType.ok, false);

  const bigImg = classifyAttachmentFile({ name: 'huge.png', type: 'image/png', size: 9 * 1024 * 1024 });
  assert.equal(bigImg.ok, false);
});

test('requiresServerDocumentParsing and getAttachmentFileCategory identify PDF, DOCX, CSV, Code, and TXT accurately', () => {
  assert.equal(requiresServerDocumentParsing('invoice.pdf', 'application/pdf'), true);
  assert.equal(requiresServerDocumentParsing('contract.DOCX', ''), true);
  assert.equal(requiresServerDocumentParsing('metrics.csv', 'text/csv'), false);
  assert.equal(requiresServerDocumentParsing('notes.txt', 'text/plain'), false);

  assert.equal(getAttachmentFileCategory('invoice.pdf', 'application/pdf'), 'pdf');
  assert.equal(getAttachmentFileCategory('brief.docx', ''), 'docx');
  assert.equal(getAttachmentFileCategory('sales.csv', 'text/csv'), 'csv');
  assert.equal(getAttachmentFileCategory('server.ts', ''), 'code');
  assert.equal(getAttachmentFileCategory('readme.txt', 'text/plain'), 'txt');
});

test('formatAttachmentBadgeMeta displays type, page count (for PDF), and readable size', () => {
  assert.equal(
    formatAttachmentBadgeMeta({
      name: 'annual-report.pdf',
      mimeType: 'application/pdf',
      size: 20480,
      fileType: 'pdf',
      pageCount: 4
    }),
    'PDF · 4p · 20 KB'
  );
  assert.equal(
    formatAttachmentBadgeMeta({
      name: 'proposal.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 15360,
      fileType: 'docx'
    }),
    'DOCX · 15 KB'
  );
  assert.equal(
    formatAttachmentBadgeMeta({
      name: 'orders.csv',
      mimeType: 'text/csv',
      size: 1024,
      fileType: 'csv'
    }),
    'CSV · 1 KB'
  );
});

test('shouldComposerExpand stays collapsed only when unfocused, empty, and no attachments/menu', () => {
  assert.equal(shouldComposerExpand({ isFocused: false, inputValue: '', attachmentCount: 0 }), false);
  assert.equal(shouldComposerExpand({ isFocused: false, inputValue: '   ', attachmentCount: 0 }), false);
  assert.equal(shouldComposerExpand({ isFocused: true, inputValue: '', attachmentCount: 0 }), true);
  assert.equal(shouldComposerExpand({ isFocused: false, inputValue: 'hello', attachmentCount: 0 }), true);
  assert.equal(shouldComposerExpand({ isFocused: false, inputValue: '', attachmentCount: 1 }), true);
  assert.equal(
    shouldComposerExpand({ isFocused: false, inputValue: '', attachmentCount: 0, isToolbarMenuOpen: true }),
    true
  );
});

test('clampComposerHeight caps textarea height at 180px and enables scroll beyond 180px', () => {
  assert.deepEqual(clampComposerHeight(72), { heightPx: 72, overflowY: 'hidden' });
  assert.deepEqual(clampComposerHeight(180), { heightPx: 180, overflowY: 'hidden' });
  assert.deepEqual(clampComposerHeight(260), { heightPx: 180, overflowY: 'auto' });
});

test('formatFileSize formats bytes, KB, and MB cleanly', () => {
  assert.equal(formatFileSize(500), '500 B');
  assert.equal(formatFileSize(2048), '2 KB');
  assert.equal(formatFileSize(1536), '1.5 KB');
  assert.equal(formatFileSize(2 * 1024 * 1024), '2.0 MB');
});

test('buildTextAttachmentPromptBlock formats text/PDF files with page metadata and skips images', () => {
  const block = buildTextAttachmentPromptBlock([
    {
      id: '1',
      name: 'photo.png',
      mimeType: 'image/png',
      size: 1200,
      kind: 'image',
      dataUrl: 'data:image/png;base64,AAAA'
    },
    {
      id: '2',
      name: 'app.py',
      mimeType: 'text/x-python',
      size: 40,
      kind: 'text',
      textContent: 'print("hello")'
    },
    {
      id: '3',
      name: 'pitch.pdf',
      mimeType: 'application/pdf',
      size: 14000,
      kind: 'text',
      fileType: 'pdf',
      pageCount: 3,
      textContent: 'Executive Summary'
    }
  ]);

  assert.match(block, /\[Attached File: app\.py\]/);
  assert.match(block, /print\("hello"\)/);
  assert.match(block, /\[Attached File: pitch\.pdf\] \(3 pages\)/);
  assert.match(block, /Executive Summary/);
  assert.doesNotMatch(block, /photo\.png/);
});

test('sanitizeIncomingAttachments validates image data URLs, preserves PDF metadata, and drops invalid payloads', () => {
  const sanitized = sanitizeIncomingAttachments([
    {
      id: 'a1',
      name: 'valid.png',
      mimeType: 'image/png',
      size: 500,
      kind: 'image',
      dataUrl: 'data:image/png;base64,AQIDBA=='
    },
    {
      id: 'a2',
      name: 'bad.png',
      mimeType: 'image/png',
      size: 500,
      kind: 'image',
      dataUrl: 'javascript:alert(1)'
    },
    {
      id: 'a3',
      name: 'notes.md',
      mimeType: 'text/markdown',
      size: 20,
      kind: 'text',
      textContent: '# Hello'
    },
    {
      id: 'a4',
      name: 'brief.pdf',
      mimeType: 'application/pdf',
      size: 12000,
      kind: 'text',
      fileType: 'pdf',
      pageCount: 2,
      textContent: 'Page 1 content'
    }
  ]);

  assert.equal(sanitized.length, 3);
  assert.equal(sanitized[0].name, 'valid.png');
  assert.equal(sanitized[1].name, 'notes.md');
  assert.equal(sanitized[2].fileType, 'pdf');
  assert.equal(sanitized[2].pageCount, 2);
});
