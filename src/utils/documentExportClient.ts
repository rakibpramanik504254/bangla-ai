import { jsPDF } from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import {
  parseDocumentForExport,
  stripInlineMarkdown,
} from './documentExport.ts';

function containsNonLatinScript(text: string): boolean {
  // Detects actual Bengali/Arabic/CJK words (\u0985-\u09DF excludes standalone currency symbol ৳ which maps cleanly to "BDT ")
  return /[\u0985-\u09DF\u09E6-\u09EF\u0600-\u06FF\u4E00-\u9FFF]/.test(text);
}

function sanitizeForWinAnsi(text: string): string {
  return text.replace(/৳\s*/g, 'BDT ').replace(/[—–]/g, '-');
}

/**
 * High-DPI Canvas-to-PDF renderer used automatically when non-Latin scripts (such as Bengali) are present,
 * ensuring accurate glyph shaping rather than broken Helvetica fallback characters.
 */
async function renderCanvasUnicodePdf(
  content: string,
  title: string,
  modelLabel: string
): Promise<jsPDF> {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await Promise.allSettled([
        document.fonts.ready,
        document.fonts.load('400 22px "Noto Sans Bengali"'),
        document.fonts.load('700 30px "Noto Sans Bengali"'),
        document.fonts.load('400 22px "Hind Siliguri"'),
        document.fonts.load('700 30px "Hind Siliguri"'),
      ]);
    } catch {
      // Proceed gracefully with available system fonts
    }
  }

  const parsed = parseDocumentForExport(content, title);
  const pageWidthPx = 1240; // ~150 DPI A4
  const pageHeightPx = 1754;
  const marginX = 92;
  const marginTop = 92;
  const marginBottom = 100;
  const contentWidth = pageWidthPx - marginX * 2;
  const pdfFontStack = '"Plus Jakarta Sans", "Noto Sans Bengali", "Hind Siliguri", system-ui, sans-serif';

  const canvases: HTMLCanvasElement[] = [];

  const createPageCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = pageWidthPx;
    canvas.height = pageHeightPx;
    const ctx = canvas.getContext('2d')!;
    if ('letterSpacing' in ctx) {
      (ctx as any).letterSpacing = '0px';
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageWidthPx, pageHeightPx);
    return { canvas, ctx };
  };

  let { canvas, ctx } = createPageCanvas();
  canvases.push(canvas);
  let y = marginTop;

  const ensureSpace = (neededPx: number) => {
    if (y + neededPx > pageHeightPx - marginBottom) {
      const next = createPageCanvas();
      canvas = next.canvas;
      ctx = next.ctx;
      canvases.push(canvas);
      y = marginTop;
    }
  };

  const wrapAndDrawLines = (
    text: string,
    font: string,
    color: string,
    lineHeight: number,
    indentX: number = 0
  ) => {
    ctx.font = font;
    ctx.fillStyle = color;
    const maxW = contentWidth - indentX;
    const words = text.split(/\s+/);
    let line = '';

    const flushLine = (str: string) => {
      ensureSpace(lineHeight);
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.fillText(str, marginX + indentX, y);
      y += lineHeight;
    };

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        flushLine(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      flushLine(line);
    }
  };

  // Header metadata
  ctx.font = `600 20px ${pdfFontStack}`;
  ctx.fillStyle = '#444746';
  ctx.fillText(`Bangla-AI.pro  ·  ${modelLabel}`, marginX, y);
  y += 28;
  ctx.fillStyle = '#1f1f1f';
  ctx.fillRect(marginX, y, contentWidth, 2);
  y += 38;

  for (const block of parsed.blocks) {
    if (block.type === 'hr') {
      ensureSpace(28);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(marginX, y, contentWidth, 1.5);
      y += 26;
      continue;
    }

    if (block.type === 'heading') {
      const sizes: Record<1 | 2 | 3 | 4, number> = { 1: 38, 2: 30, 3: 25, 4: 22 };
      const sz = sizes[block.level];
      y += block.level === 1 ? 8 : 14;
      wrapAndDrawLines(
        stripInlineMarkdown(block.text),
        `700 ${sz}px ${pdfFontStack}`,
        '#1f1f1f',
        sz + 16
      );
      y += 8;
      continue;
    }

    if (block.type === 'paragraph') {
      wrapAndDrawLines(
        stripInlineMarkdown(block.text),
        `400 22px ${pdfFontStack}`,
        '#2b2d30',
        36
      );
      y += 14;
      continue;
    }

    if (block.type === 'blockquote') {
      const text = block.lines.map(stripInlineMarkdown).join(' ');
      wrapAndDrawLines(
        text,
        `italic 21px ${pdfFontStack}`,
        '#444746',
        34,
        24
      );
      y += 12;
      continue;
    }

    if (block.type === 'list') {
      block.items.forEach((item, idx) => {
        const prefix = block.ordered ? `${idx + 1}. ` : '•  ';
        wrapAndDrawLines(
          `${prefix}${stripInlineMarkdown(item)}`,
          `400 22px ${pdfFontStack}`,
          '#2b2d30',
          35,
          24
        );
      });
      y += 14;
      continue;
    }

    if (block.type === 'table') {
      const rows = [block.headers, ...block.rows];
      rows.forEach((row, rIdx) => {
        const line = row.map(stripInlineMarkdown).join('   |   ');
        wrapAndDrawLines(
          line,
          `${rIdx === 0 ? '700' : '400'} 20px ${pdfFontStack}`,
          rIdx === 0 ? '#1f1f1f' : '#2b2d30',
          32,
          12
        );
      });
      y += 16;
      continue;
    }

    if (block.type === 'code') {
      for (const codeLine of block.code.split('\n')) {
        wrapAndDrawLines(
          codeLine || ' ',
          '400 18px "JetBrains Mono", monospace',
          '#1f2937',
          26,
          18
        );
      }
      y += 14;
    }
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pdfW = doc.internal.pageSize.getWidth();
  const pdfH = doc.internal.pageSize.getHeight();

  canvases.forEach((pageCanvas, idx) => {
    if (idx > 0) doc.addPage();
    const cCtx = pageCanvas.getContext('2d')!;
    cCtx.font = `500 17px ${pdfFontStack}`;
    cCtx.fillStyle = '#64748b';
    cCtx.fillText(`Bangla-AI.pro`, marginX, pageHeightPx - 44);
    const pageLabel = `Page ${idx + 1} of ${canvases.length}`;
    const labelW = cCtx.measureText(pageLabel).width;
    cCtx.fillText(pageLabel, pageWidthPx - marginX - labelW, pageHeightPx - 44);

    const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
    doc.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
  });

  return doc;
}

/**
 * Generates and downloads a structured A4 PDF document from AI response markdown.
 */
export async function exportResponseToPdf(
  content: string,
  options?: { modelLabel?: string; title?: string }
): Promise<{ filename: string; pageCount: number }> {
  const parsed = parseDocumentForExport(content, options?.title || 'Bangla AI Document');
  const modelLabel = options?.modelLabel || 'Bangla AI';
  const filename = `${parsed.fileSlug}.pdf`;

  if (containsNonLatinScript(content) && typeof document !== 'undefined') {
    const unicodeDoc = await renderCanvasUnicodePdf(content, parsed.title, modelLabel);
    unicodeDoc.save(filename);
    return { filename, pageCount: unicodeDoc.getNumberOfPages() };
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 52;
  const marginBottom = 56;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = marginTop;

  const ensureSpace = (neededPt: number) => {
    if (cursorY + neededPt > pageHeight - marginBottom) {
      doc.addPage();
      cursorY = marginTop;
    }
  };

  // Document Header Bar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(85, 90, 98);
  doc.text(`BANGLA-AI.PRO  ·  ${modelLabel.toUpperCase()}`, marginX, cursorY);
  cursorY += 10;
  doc.setDrawColor(31, 31, 31);
  doc.setLineWidth(1.2);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 22;

  const drawWrapped = (
    text: string,
    fontStyle: 'normal' | 'bold' | 'italic',
    fontSize: number,
    color: [number, number, number],
    lineHeight: number,
    indentX: number = 0
  ) => {
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(sanitizeForWinAnsi(text), contentWidth - indentX) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.setFont('helvetica', fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(line, marginX + indentX, cursorY);
      cursorY += lineHeight;
    }
  };

  for (const block of parsed.blocks) {
    if (block.type === 'hr') {
      ensureSpace(20);
      doc.setDrawColor(210, 214, 220);
      doc.setLineWidth(0.75);
      doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
      cursorY += 16;
      continue;
    }

    if (block.type === 'heading') {
      const sizeMap: Record<1 | 2 | 3 | 4, number> = { 1: 19, 2: 14.5, 3: 12, 4: 11 };
      const size = sizeMap[block.level];
      cursorY += block.level === 1 ? 4 : 8;
      drawWrapped(stripInlineMarkdown(block.text), 'bold', size, [24, 24, 27], size + 5);
      cursorY += 4;
      continue;
    }

    if (block.type === 'paragraph') {
      drawWrapped(stripInlineMarkdown(block.text), 'normal', 10.5, [42, 45, 52], 15.5);
      cursorY += 7;
      continue;
    }

    if (block.type === 'blockquote') {
      const quote = block.lines.map(stripInlineMarkdown).join(' ');
      drawWrapped(quote, 'italic', 10, [75, 82, 92], 15, 14);
      cursorY += 7;
      continue;
    }

    if (block.type === 'list') {
      block.items.forEach((item, idx) => {
        const prefix = block.ordered ? `${idx + 1}. ` : '• ';
        drawWrapped(`${prefix}${stripInlineMarkdown(item)}`, 'normal', 10.5, [42, 45, 52], 15, 12);
      });
      cursorY += 7;
      continue;
    }

    if (block.type === 'table') {
      const colCount = Math.max(1, block.headers.length);
      const colW = contentWidth / colCount;

      const drawTableRow = (cells: string[], isHeader: boolean) => {
        const cellLines = cells.map((cell) =>
          doc.splitTextToSize(sanitizeForWinAnsi(stripInlineMarkdown(cell)) || ' ', colW - 10) as string[]
        );
        const maxLines = Math.max(1, ...cellLines.map((l) => l.length));
        const rowHeight = maxLines * 13 + 10;
        ensureSpace(rowHeight + 4);

        if (isHeader) {
          doc.setFillColor(240, 244, 249);
          doc.rect(marginX, cursorY - 10, contentWidth, rowHeight, 'F');
        }
        doc.setDrawColor(215, 220, 228);
        doc.setLineWidth(0.5);
        doc.rect(marginX, cursorY - 10, contentWidth, rowHeight);

        cellLines.forEach((lines, cIdx) => {
          const cellX = marginX + cIdx * colW + 5;
          if (cIdx > 0) {
            doc.line(marginX + cIdx * colW, cursorY - 10, marginX + cIdx * colW, cursorY - 10 + rowHeight);
          }
          doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(31, 31, 31);
          lines.forEach((ln, lIdx) => {
            doc.text(ln, cellX, cursorY + 2 + lIdx * 13);
          });
        });

        cursorY += rowHeight - 2;
      };

      drawTableRow(block.headers, true);
      block.rows.forEach((row) => drawTableRow(row, false));
      cursorY += 12;
      continue;
    }

    if (block.type === 'code') {
      const codeLines = block.code.split('\n');
      for (const ln of codeLines) {
        ensureSpace(13);
        doc.setFont('courier', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(45, 52, 64);
        const wrapped = doc.splitTextToSize(ln || ' ', contentWidth - 16) as string[];
        for (const w of wrapped) {
          ensureSpace(13);
          doc.text(w, marginX + 8, cursorY);
          cursorY += 12.5;
        }
      }
      cursorY += 8;
    }
  }

  // Page numbers footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 126, 136);
    doc.text('Generated by Bangla-AI.pro', marginX, pageHeight - 24);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 24, { align: 'right' });
  }

  doc.save(filename);
  return { filename, pageCount: totalPages };
}

/**
 * Generates and downloads a 16:9 PowerPoint (.pptx) presentation deck from AI response markdown.
 */
export async function exportResponseToPptx(
  content: string,
  options?: { modelLabel?: string; title?: string }
): Promise<{ filename: string; slideCount: number }> {
  const parsed = parseDocumentForExport(content, options?.title || 'Bangla AI Presentation');
  const modelLabel = options?.modelLabel || 'Bangla AI';
  const filename = `${parsed.fileSlug}.pptx`;

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Bangla-AI.pro';
  pptx.company = 'Bangla AI';
  pptx.title = parsed.title;

  // Slide 1: Editorial Cover Slide
  const cover = pptx.addSlide();
  cover.background = { color: 'F8FAFC' };
  cover.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.14,
    fill: { color: '1F1F1F' },
  });
  cover.addText('BANGLA-AI.PRO', {
    x: 0.85,
    y: 1.35,
    w: 8.3,
    h: 0.35,
    fontFace: 'Arial',
    fontSize: 11,
    bold: true,
    color: '64748B',
    charSpacing: 2,
  });
  cover.addText(parsed.title, {
    x: 0.85,
    y: 1.9,
    w: 8.3,
    h: 1.6,
    fontFace: 'Arial',
    fontSize: 32,
    bold: true,
    color: '1F1F1F',
    valign: 'top',
  });
  cover.addText(`Prepared with ${modelLabel}  ·  ${parsed.slides.length} Content Slide${parsed.slides.length > 1 ? 's' : ''}`, {
    x: 0.85,
    y: 4.55,
    w: 8.3,
    h: 0.4,
    fontFace: 'Arial',
    fontSize: 13,
    color: '444746',
  });

  // Content Slides
  parsed.slides.forEach((slideSpec, idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Top accent bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.08,
      fill: { color: '1F1F1F' },
    });

    // Slide Title
    slide.addText(slideSpec.title, {
      x: 0.65,
      y: 0.38,
      w: 8.7,
      h: 0.62,
      fontFace: 'Arial',
      fontSize: 22,
      bold: true,
      color: '1F1F1F',
    });

    slide.addShape(pptx.ShapeType.line, {
      x: 0.65,
      y: 1.05,
      w: 8.7,
      h: 0,
      line: { color: 'E2E8F0', width: 1 },
    });

    let currentY = 1.22;

    if (slideSpec.subtitle) {
      slide.addText(slideSpec.subtitle, {
        x: 0.65,
        y: currentY,
        w: 8.7,
        h: 0.42,
        fontFace: 'Arial',
        fontSize: 13.5,
        italic: true,
        color: '444746',
      });
      currentY += 0.48;
    }

    if (slideSpec.bodyParagraphs.length > 0) {
      const combinedPara = slideSpec.bodyParagraphs.slice(0, 2).join('\n\n');
      const paraHeight = Math.min(1.5, Math.max(0.55, Math.ceil(combinedPara.length / 95) * 0.34));
      slide.addText(combinedPara, {
        x: 0.65,
        y: currentY,
        w: 8.7,
        h: paraHeight,
        fontFace: 'Arial',
        fontSize: 13.5,
        color: '2B2D30',
        valign: 'top',
      });
      currentY += paraHeight + 0.14;
    }

    if (slideSpec.bullets.length > 0) {
      const remainingH = Math.max(1.2, 5.05 - currentY);
      slide.addText(
        slideSpec.bullets.map((b) => ({
          text: b,
          options: { bullet: true, breakLine: true },
        })),
        {
          x: 0.65,
          y: currentY,
          w: 8.7,
          h: remainingH,
          fontFace: 'Arial',
          fontSize: 14,
          color: '1F1F1F',
          paraSpaceAfter: 8,
          valign: 'top',
        }
      );
      currentY += Math.min(remainingH, slideSpec.bullets.length * 0.42 + 0.2);
    }

    if (slideSpec.tables.length > 0) {
      const tbl = slideSpec.tables[0];
      const tableRows = [
        tbl.headers.map((h) => ({
          text: h,
          options: { bold: true, fill: { color: 'F0F4F9' }, color: '1F1F1F' },
        })),
        ...tbl.rows.slice(0, 6).map((row) =>
          row.map((cell) => ({
            text: cell,
            options: { color: '2B2D30' },
          }))
        ),
      ];
      slide.addTable(tableRows, {
        x: 0.65,
        y: Math.min(currentY, 3.3),
        w: 8.7,
        fontFace: 'Arial',
        fontSize: 11.5,
        border: { type: 'solid', color: 'CBD5E1', pt: 0.75 },
        margin: [6, 8, 6, 8],
      });
    }

    // Slide Footer
    slide.addText('Bangla-AI.pro', {
      x: 0.65,
      y: 5.22,
      w: 4.0,
      h: 0.25,
      fontFace: 'Arial',
      fontSize: 9.5,
      color: '94A3B8',
    });
    slide.addText(`${idx + 2} / ${parsed.slides.length + 1}`, {
      x: 7.5,
      y: 5.22,
      w: 1.85,
      h: 0.25,
      fontFace: 'Arial',
      fontSize: 9.5,
      color: '94A3B8',
      align: 'right',
    });
  });

  await pptx.writeFile({ fileName: filename });
  return { filename, slideCount: parsed.slides.length + 1 };
}
