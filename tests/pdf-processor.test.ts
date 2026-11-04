import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generatePrintReadyPdf, parsePageRanges } from '../src/lib/pdf-processor';

describe('PDF Processor & Imposition Engine', () => {
  it('parses page ranges correctly', () => {
    expect(parsePageRanges('1-3, 5, 7-8', 10)).toEqual([0, 1, 2, 4, 6, 7]);
    expect(parsePageRanges('all', 3)).toEqual([0, 1, 2]);
    expect(parsePageRanges('odd', 5)).toEqual([0, 2, 4]);
    expect(parsePageRanges('even', 5)).toEqual([1, 3]);
  });

  it('slices specific page range from PDF', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([600, 400]);
    doc.addPage([600, 400]);
    doc.addPage([600, 400]);
    const pdfBytes = await doc.save();

    const outputBuffer = await generatePrintReadyPdf(Buffer.from(pdfBytes), {
      pageRange: '1,3',
      nUp: 1,
      isGrayscale: false,
    });

    const resultDoc = await PDFDocument.load(outputBuffer);
    expect(resultDoc.getPageCount()).toBe(2);
  });

  it('performs 2-up imposition onto destination sheet', async () => {
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 4; i++) {
      const p = doc.addPage([595, 842]); // A4
      p.drawRectangle({ x: 50, y: 50, width: 200, height: 200 });
    }
    const pdfBytes = await doc.save();

    const outputBuffer = await generatePrintReadyPdf(Buffer.from(pdfBytes), {
      pageRange: 'all',
      nUp: 2,
      isGrayscale: false,
    });

    const resultDoc = await PDFDocument.load(outputBuffer);
    // 4 pages placed 2 per sheet = 2 destination sheets
    expect(resultDoc.getPageCount()).toBe(2);
  });
});
