import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectExportableDocument,
  parseDocumentForExport,
  slugifyFilename,
  stripInlineMarkdown
} from './documentExport.ts';

test('detectExportableDocument identifies presentations, CVs, and structured reports while ignoring short chat replies', () => {
  const casual = 'Sure! Let me know what topic you want to explore next.';
  assert.equal(detectExportableDocument(casual).hasStructuredDoc, false);

  const codeOnly = 'Here is the function:\n```ts\nexport const add = (a: number, b: number) => a + b;\n```';
  assert.equal(detectExportableDocument(codeOnly).hasStructuredDoc, false);

  const slides = `# Startup Pitch Deck\n\n---\n\n## Slide 1: Problem Statement\n\n- Manual invoicing slows SMEs in Dhaka.\n- Zero automated reconciliation.\n\n---\n\n## Slide 2: Solution\n\n- Unified Bangla AI workflow.\n- Instant bKash & Nagad billing.`;
  const slideDetect = detectExportableDocument(slides);
  assert.equal(slideDetect.hasStructuredDoc, true);
  assert.equal(slideDetect.kind, 'presentation');
  assert.ok(slideDetect.slideCount >= 2);

  const cv = `# Tanvir Ahmed — Senior Full-Stack Engineer\n\n## Professional Experience\n- Lead Engineer at Dhaka Cloud Systems (2022–Present)\n- Built scalable payment pipelines.\n\n## Education\n- B.Sc. in CSE, BUET\n\n## Skills\n- TypeScript, React, Node.js, PostgreSQL`;
  const cvDetect = detectExportableDocument(cv);
  assert.equal(cvDetect.hasStructuredDoc, true);
  assert.equal(cvDetect.kind, 'cv');

  const report = `# Q4 Market Expansion Report\n\n## Executive Summary\nDigital commerce adoption across Bangladesh accelerated rapidly in Q4 with strong mobile-first retention.\n\n## Key Metrics\n| Segment | Growth | Revenue |\n| --- | --- | --- |\n| Retail | +42% | 12.4M BDT |`;
  const reportDetect = detectExportableDocument(report);
  assert.equal(reportDetect.hasStructuredDoc, true);
  assert.equal(reportDetect.kind, 'report');
});

test('parseDocumentForExport splits slides cleanly, preserves tables & bullets, and paginates dense slides', () => {
  const manyBullets = Array.from({ length: 9 }, (_, i) => `- Key insight #${i + 1} for enterprise adoption`).join('\n');
  const deck = `## Slide 1: Market Landscape\n\nOverview of SaaS adoption in Bangladesh.\n\n${manyBullets}\n\n---\n\n## Slide 2: Pricing Breakdown\n\n| Plan | Price |\n| --- | --- |\n| Monthly | 699 BDT |`;

  const parsed = parseDocumentForExport(deck);
  assert.equal(parsed.kind, 'presentation');
  assert.equal(parsed.title, 'Market Landscape');
  assert.equal(parsed.fileSlug, 'market-landscape');
  // 9 bullets split across 2 slides (6 + 3), plus Slide 2 -> 3 slides total
  assert.equal(parsed.slides.length, 3);
  assert.equal(parsed.slides[0].bullets.length, 6);
  assert.equal(parsed.slides[1].title, 'Market Landscape (Cont.)');
  assert.equal(parsed.slides[1].bullets.length, 3);
  assert.equal(parsed.slides[2].tables.length, 1);
  assert.deepEqual(parsed.slides[2].tables[0].headers, ['Plan', 'Price']);
});

test('stripInlineMarkdown and slugifyFilename sanitize formatting safely', () => {
  assert.equal(stripInlineMarkdown('**Bold** `code` [Link](https://bangla-ai.pro)'), 'Bold code Link');
  assert.equal(slugifyFilename('Q4 Sales & Growth Report!'), 'q4-sales-growth-report');
  assert.equal(slugifyFilename('বাংলা প্রতিবেদন', 'bangla-report'), 'bangla-report');
});
