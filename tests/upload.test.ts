import { describe, it, expect, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

describe('Real Document Upload & Image-to-PDF Conversion', () => {
  const testDir = path.join(process.cwd(), 'public', 'uploads', 'test-shop');

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  it('saves file buffer into shop uploads directory', async () => {
    await fs.mkdir(testDir, { recursive: true });
    const testFile = path.join(testDir, 'test_sample.pdf');
    await fs.writeFile(testFile, Buffer.from('%PDF-1.4 test document content'));

    expect(await fs.stat(testFile)).toBeDefined();
    const content = await fs.readFile(testFile, 'utf-8');
    expect(content).toContain('%PDF-1.4');
  });

  it('can convert a valid PNG image buffer to PDF using pdf-lib', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();

    // 1x1 transparent PNG in base64
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const pngBuffer = Buffer.from(pngBase64, 'base64');

    const image = await pdfDoc.embedPng(pngBuffer);
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawImage(image, { x: 50, y: 50, width: 200, height: 200 });

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(100);

    const reloaded = await PDFDocument.load(pdfBytes);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
