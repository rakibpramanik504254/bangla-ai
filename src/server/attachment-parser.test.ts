import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AttachmentParseError,
  parseAttachmentBuffer,
  parseAttachmentPayload
} from './attachment-parser.ts';

function buildMinimalPdfBuffer(text: string): Buffer {
  const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const streamContent = `BT\n/F1 14 Tf\n72 720 Td\n(${escaped}) Tj\nET\n`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildStoredZip(entries: Array<{ name: string; content: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const dataBuf = entry.content;
    const crc = crc32(dataBuf);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(dataBuf.length, 18);
    localHeader.writeUInt32LE(dataBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, dataBuf);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(dataBuf.length, 20);
    centralHeader.writeUInt32LE(dataBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + dataBuf.length;
  }

  const centralSize = centralParts.reduce((acc, b) => acc + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

function buildMinimalDocxBuffer(paragraphText: string): Buffer {
  const xmlSafe = paragraphText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${xmlSafe}</w:t></w:r></w:p>
  </w:body>
</w:document>`;

  return buildStoredZip([
    { name: '[Content_Types].xml', content: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', content: Buffer.from(rels, 'utf8') },
    { name: 'word/document.xml', content: Buffer.from(docXml, 'utf8') }
  ]);
}

test('parseAttachmentBuffer extracts text and page count from real PDF buffer', async () => {
  const pdfBuffer = buildMinimalPdfBuffer('Bangla AI Invoice Total 12500 BDT');
  const result = await parseAttachmentPayload({
    name: 'invoice.pdf',
    mimeType: 'application/pdf',
    dataBase64: pdfBuffer.toString('base64')
  });

  assert.equal(result.name, 'invoice.pdf');
  assert.equal(result.kind, 'text');
  assert.equal(result.fileType, 'pdf');
  assert.equal(result.pageCount, 1);
  assert.match(result.textContent, /Bangla AI Invoice Total 12500 BDT/);
});

test('parseAttachmentBuffer extracts text from real DOCX archive', async () => {
  const docxBuffer = buildMinimalDocxBuffer('Bangla AI Strategic Proposal Summary');
  const result = await parseAttachmentPayload({
    name: 'proposal.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    dataBase64: docxBuffer.toString('base64')
  });

  assert.equal(result.name, 'proposal.docx');
  assert.equal(result.kind, 'text');
  assert.equal(result.fileType, 'docx');
  assert.match(result.textContent, /Bangla AI Strategic Proposal Summary/);
});

test('parseAttachmentBuffer parses CSV and rejects corrupt PDF or unsupported extensions cleanly', async () => {
  const csvResult = await parseAttachmentBuffer({
    name: 'revenue.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('month,bdt\nJan,45000\nFeb,62000', 'utf8')
  });
  assert.equal(csvResult.fileType, 'csv');
  assert.match(csvResult.textContent, /Jan,45000/);

  await assert.rejects(
    () =>
      parseAttachmentBuffer({
        name: 'corrupt.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('not a real pdf', 'utf8')
      }),
    (err: unknown) => err instanceof AttachmentParseError && err.statusCode === 422
  );

  await assert.rejects(
    () =>
      parseAttachmentBuffer({
        name: 'script.exe',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from('MZ', 'utf8')
      }),
    (err: unknown) => err instanceof AttachmentParseError && err.statusCode === 400
  );
});
