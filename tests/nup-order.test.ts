import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { createOrderCheckoutLogic } from '../src/lib/order-service';
import { PDFDocument, rgb } from 'pdf-lib';
import { promises as fs } from 'fs';
import path from 'path';

describe('Order Specification Enforcement (6-up & BW)', () => {
  const shopSlug = `spec-test-${Date.now()}`;
  let shopId = '';

  beforeAll(async () => {
    const shop = await prisma.shop.create({
      data: {
        name: 'Spec Xerox Test',
        slug: shopSlug,
        ownerName: 'Spec Owner',
        email: `spec_${Date.now()}@test.com`,
        mobile: '9988776655',
        address: '123 Spec Road, Tech Park',
        city: 'Bangalore',
        state: 'Karnataka',
        pinCode: '560001',
        pricing: {
          create: {
            bwSingle: 2.0,
            bwDuplex: 1.5,
            colorSingle: 10.0,
            colorDuplex: 9.0,
          },
        },
      },
    });
    shopId = shop.id;

    // Create a sample 6-page PDF on disk in public/uploads/<shopSlug>/
    const testDir = path.join(process.cwd(), 'public', 'uploads', shopSlug);
    await fs.mkdir(testDir, { recursive: true });

    const srcDoc = await PDFDocument.create();
    for (let i = 1; i <= 6; i++) {
      const p = srcDoc.addPage([595.28, 841.89]);
      p.drawRectangle({ x: 50, y: 50, width: 200, height: 200, color: rgb(0.2, 0.4, 0.8) });
    }
    const pdfBytes = await srcDoc.save();
    await fs.writeFile(path.join(testDir, 'original_6_pages.pdf'), Buffer.from(pdfBytes));
  });

  afterAll(async () => {
    try {
      const testDir = path.join(process.cwd(), 'public', 'uploads', shopSlug);
      await fs.rm(testDir, { recursive: true, force: true });
      await prisma.document.deleteMany({ where: { shopId } });
      await prisma.printJob.deleteMany({ where: { order: { shopId } } });
      await prisma.order.deleteMany({ where: { shopId } });
      await prisma.shopPricing.deleteMany({ where: { shopId } });
      await prisma.printer.deleteMany({ where: { shopId } });
      await prisma.shop.delete({ where: { id: shopId } });
    } catch {}
  });

  it('imposes 6 pages into 1 sheet and saves print-ready PDF with specs applied', async () => {
    const { order } = await createOrderCheckoutLogic({
      shopSlug,
      customerName: 'Spec Tester',
      jobs: [
        {
          documentName: 'original_6_pages.pdf',
          storageUrl: `/uploads/${shopSlug}/original_6_pages.pdf`,
          pageCount: 6,
          copies: 1,
          colorMode: 'BW',
          nUp: 6,
          pageRange: 'all',
        },
      ],
    });

    expect(order).toBeDefined();
    expect(order.documents.length).toBe(1);

    const doc = order.documents[0];
    // Must be imposed into 1 sheet (6-up on 6 pages = 1 sheet)
    expect(doc.pageCount).toBe(1);
    expect(doc.storageUrl).toContain('print_ready_');

    // Verify physical file on disk
    const onDiskPath = path.join(process.cwd(), 'public', doc.storageUrl.replace(/^\//, ''));
    const fileBytes = await fs.readFile(onDiskPath);
    const loadedPdf = await PDFDocument.load(fileBytes);

    expect(loadedPdf.getPageCount()).toBe(1);
    const size = loadedPdf.getPage(0).getSize();
    // 6-up is landscape A4
    expect(size.width).toBeGreaterThan(size.height);
  });

  it('combines 9 separate uploaded photos into 1 single 9-up A4 sheet', async () => {
    const { createCanvas } = await import('canvas');
    const testDir = path.join(process.cwd(), 'public', 'uploads', shopSlug);
    const photoUrls: string[] = [];

    // Create 9 dummy photos
    for (let i = 1; i <= 9; i++) {
      const c = createCanvas(50, 50);
      const ctx = c.getContext('2d');
      ctx.fillStyle = i % 2 === 0 ? '#ff0000' : '#0000ff';
      ctx.fillRect(0, 0, 50, 50);
      const filename = `photo_${i}.jpg`;
      await fs.writeFile(path.join(testDir, filename), c.toBuffer('image/jpeg'));
      photoUrls.push(`/uploads/${shopSlug}/${filename}`);
    }

    const { order } = await createOrderCheckoutLogic({
      shopSlug,
      customerName: 'Multi Photo Tester',
      jobs: [
        {
          documentName: 'Combined_9_Photos_9up.pdf',
          storageUrls: photoUrls,
          pageCount: 1,
          copies: 1,
          colorMode: 'BW',
          nUp: 9,
        },
      ],
    });

    expect(order).toBeDefined();
    expect(order.documents.length).toBe(1);

    const doc = order.documents[0];
    expect(doc.pageCount).toBe(1);
    expect(doc.storageUrl).toContain('print_ready_merged_');

    const onDiskPath = path.join(process.cwd(), 'public', doc.storageUrl.replace(/^\//, ''));
    const fileBytes = await fs.readFile(onDiskPath);
    const loadedPdf = await PDFDocument.load(fileBytes);

    expect(loadedPdf.getPageCount()).toBe(1);
    const size = loadedPdf.getPage(0).getSize();
    // 9-up is portrait A4
    expect(Math.round(size.width)).toBe(595);
    expect(Math.round(size.height)).toBe(842);

    // Verify monochrome conversion: zero /DeviceRGB
    const pdfStr = fileBytes.toString('latin1');
    expect(pdfStr).toContain('/ColorSpace /DeviceGray');
    expect(pdfStr).not.toContain('/ColorSpace /DeviceRGB');
  });
});
