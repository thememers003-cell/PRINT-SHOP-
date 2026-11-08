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

  it('performs 4-up imposition onto destination sheet', async () => {
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 8; i++) {
      const p = doc.addPage([595.28, 841.89]);
      p.drawRectangle({ x: 50, y: 50, width: 200, height: 200 });
    }
    const pdfBytes = await doc.save();

    const outputBuffer = await generatePrintReadyPdf(Buffer.from(pdfBytes), {
      pageRange: 'all',
      nUp: 4,
      isGrayscale: false,
    });

    const resultDoc = await PDFDocument.load(outputBuffer);
    // 8 pages placed 4 per sheet = 2 destination sheets
    expect(resultDoc.getPageCount()).toBe(2);
    const size = resultDoc.getPage(0).getSize();
    // 4-up is standard portrait A4
    expect(size.height).toBeGreaterThan(size.width);
  });

  it('performs 9-up (3x3 grid) imposition onto destination sheet', async () => {
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 18; i++) {
      const p = doc.addPage([595.28, 841.89]);
      p.drawRectangle({ x: 50, y: 50, width: 200, height: 200 });
    }
    const pdfBytes = await doc.save();

    const outputBuffer = await generatePrintReadyPdf(Buffer.from(pdfBytes), {
      pageRange: 'all',
      nUp: 9,
      isGrayscale: false,
    });

    const resultDoc = await PDFDocument.load(outputBuffer);
    // 18 pages placed 9 per sheet = 2 destination sheets
    expect(resultDoc.getPageCount()).toBe(2);
    const size = resultDoc.getPage(0).getSize();
    // 9-up is standard portrait A4 (3x3 grid)
    expect(size.height).toBeGreaterThan(size.width);
  });

  it('wraps an image into a standard A4 PDF with safe margins', async () => {
    // 1x1 transparent PNG buffer
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const imgBuffer = Buffer.from(pngBase64, 'base64');

    const outputBuffer = await generatePrintReadyPdf(imgBuffer, {
      nUp: 1,
      isGrayscale: false,
      orientation: 'PORTRAIT',
    });

    const resultDoc = await PDFDocument.load(outputBuffer);
    expect(resultDoc.getPageCount()).toBe(1);
    const size = resultDoc.getPage(0).getSize();
    // Portrait A4: ~595 x 842
    expect(Math.round(size.width)).toBe(595);
    expect(Math.round(size.height)).toBe(842);
  });

  it('converts color image to true DeviceGray PDF with zero DeviceRGB', async () => {
    // 2x2 red PNG
    const { createCanvas } = await import('canvas');
    const canvas = createCanvas(10, 10);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 10, 10);
    const imgBuffer = canvas.toBuffer('image/jpeg');

    const outputBuffer = await generatePrintReadyPdf(imgBuffer, {
      nUp: 1,
      isGrayscale: true,
      orientation: 'PORTRAIT',
    });

    const pdfStr = outputBuffer.toString('latin1');
    expect(pdfStr).toContain('/ColorSpace /DeviceGray');
    expect(pdfStr).not.toContain('/ColorSpace /DeviceRGB');
  });

  it('imposes 4-up on an image directly into grid cells', async () => {
    const { createCanvas } = await import('canvas');
    const canvas = createCanvas(20, 20);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(0, 0, 20, 20);
    const imgBuffer = canvas.toBuffer('image/jpeg');

    const outputBuffer = await generatePrintReadyPdf(imgBuffer, {
      nUp: 4,
      isGrayscale: false,
    });

    const resultDoc = await PDFDocument.load(outputBuffer);
    expect(resultDoc.getPageCount()).toBe(1);
    const size = resultDoc.getPage(0).getSize();
    // 4-up is standard Portrait A4
    expect(Math.round(size.width)).toBe(595);
    expect(Math.round(size.height)).toBe(842);
  });

  it('imposes 9-up (3x3) on an image directly into grid cells with true grayscale', async () => {
    const { createCanvas } = await import('canvas');
    const canvas = createCanvas(20, 20);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(0, 0, 20, 20);
    const imgBuffer = canvas.toBuffer('image/jpeg');

    const outputBuffer = await generatePrintReadyPdf(imgBuffer, {
      nUp: 9,
      isGrayscale: true,
    });

    const resultDoc = await PDFDocument.load(outputBuffer);
    expect(resultDoc.getPageCount()).toBe(1);
    const size = resultDoc.getPage(0).getSize();
    // 9-up is standard Portrait A4
    expect(Math.round(size.width)).toBe(595);
    expect(Math.round(size.height)).toBe(842);

    const pdfStr = outputBuffer.toString('latin1');
    expect(pdfStr).toContain('/ColorSpace /DeviceGray');
    expect(pdfStr).not.toContain('/ColorSpace /DeviceRGB');
  });
});
