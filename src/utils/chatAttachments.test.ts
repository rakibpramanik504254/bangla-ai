import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyAttachmentFile,
  formatFileSize,
  shouldComposerExpand,
  clampComposerHeight,
  buildTextAttachmentPromptBlock,
  sanitizeIncomingAttachments
} from './chatAttachments.ts';

test('classifyAttachmentFile accepts supported images and code/doc files and rejects unsupported/oversized ones', () => {
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

  for (const ext of ['.txt', '.md', '.csv', '.json', '.js', '.ts', '.py', '.html', '.css']) {
    assert.deepEqual(classifyAttachmentFile({ name: `sample${ext}`, type: '', size: 512 }), {
      ok: true,
      kind: 'text'
    });
  }

  const badType = classifyAttachmentFile({ name: 'malware.exe', type: 'application/octet-stream', size: 100 });
  assert.equal(badType.ok, false);

  const bigImg = classifyAttachmentFile({ name: 'huge.png', type: 'image/png', size: 9 * 1024 * 1024 });
  assert.equal(bigImg.ok, false);
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

test('buildTextAttachmentPromptBlock formats text files and skips images', () => {
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
    }
  ]);

  assert.match(block, /\[Attached File: app\.py\]/);
  assert.match(block, /print\("hello"\)/);
  assert.doesNotMatch(block, /photo\.png/);
});

test('sanitizeIncomingAttachments validates image data URLs and drops invalid payloads', () => {
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
    }
  ]);

  assert.equal(sanitized.length, 2);
  assert.equal(sanitized[0].name, 'valid.png');
  assert.equal(sanitized[1].name, 'notes.md');
});
