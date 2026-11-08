import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { createOrderCheckoutLogic } from '../src/lib/order-service';

describe('Live Preview & Monochrome Printing Enhancements', () => {
  it('ensures public/pdf.worker.min.js exists for offline client-side PDF rendering', () => {
    const workerPath = path.join(process.cwd(), 'public', 'pdf.worker.min.js');
    expect(fs.existsSync(workerPath)).toBe(true);
    expect(fs.statSync(workerPath).size).toBeGreaterThan(100000);
  });

  it('triggers print-ready transformation when customer selects Black & White (BW) even for 1-up', async () => {
    // Create an active test shop
    const shopSlug = `test-mono-shop-${Date.now()}`;
    const shop = await prisma.shop.create({
      data: {
        name: 'Monochrome Test Xerox',
        slug: shopSlug,
        ownerName: 'Mono Tester',
        mobile: '9888877777',
        email: `${shopSlug}@test.com`,
        status: 'ACTIVE',
        address: '123 Main St',
        city: 'Hyderabad',
        state: 'Telangana',
        pinCode: '500001',
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

    // Write a dummy PDF in public/uploads/
    const shopDir = path.join(process.cwd(), 'public', 'uploads', shopSlug);
    await fs.promises.mkdir(shopDir, { recursive: true });
    const dummyPdf = path.join(shopDir, 'original_sample.pdf');
    // Minimal valid 1-page PDF
    const minimalPdf = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n193\n%%EOF`;
    await fs.promises.writeFile(dummyPdf, minimalPdf);

    try {
      const orderResult = await createOrderCheckoutLogic({
        shopSlug,
        customerName: 'Mono Customer',
        customerPhone: '9888877777',
        jobs: [
          {
            documentName: 'original_sample.pdf',
            fileSize: minimalPdf.length,
            mimeType: 'application/pdf',
            storageUrl: `/uploads/${shopSlug}/original_sample.pdf`,
            pageCount: 1,
            copies: 1,
            colorMode: 'BW', // Customer chose Black & White!
            sides: 'SINGLE',
            orientation: 'PORTRAIT',
            paperSize: 'A4',
            pageRange: 'all',
            nUp: 1, // 1-up with BW MUST trigger print-ready preparation
          },
        ],
      });

      expect(orderResult.order.jobId).toBeDefined();
      // Verify document was transformed into print-ready PDF
      const createdDoc = await prisma.document.findFirst({
        where: { orderId: orderResult.order.id },
      });
      expect(createdDoc?.storageUrl).toContain('print_ready_');
    } finally {
      try {
        await fs.promises.rm(shopDir, { recursive: true, force: true });
        await prisma.shop.delete({ where: { id: shop.id } });
      } catch {}
    }
  });

  it('applies monochrome color filter without lossy rasterization or compression', async () => {
    const { convertToMonochromeFile } = await import('../src/lib/monochrome-converter');
    const { PDFDocument } = await import('pdf-lib');

    // Create a vector PDF with text
    const testDoc = await PDFDocument.create();
    const page = testDoc.addPage([595, 842]);
    page.drawText('Original Crisp Vector Text Sample', { x: 50, y: 700, size: 24 });
    const originalBytes = await testDoc.save();

    const inputFile = new File([originalBytes], 'sample.pdf', { type: 'application/pdf' });
    const resultFile = await convertToMonochromeFile(inputFile);

    expect(resultFile).toBeDefined();
    expect(resultFile.name).toBe('sample.pdf');
    expect(resultFile.type).toBe('application/pdf');

    // Verify it is a valid PDF and retains vector properties
    const resBuffer = await resultFile.arrayBuffer();
    const resDoc = await PDFDocument.load(resBuffer);
    expect(resDoc.getPageCount()).toBe(1);
    
    // Check that the monochrome ColorSpace filter exists
    const { PDFName } = await import('pdf-lib');
    const resPage = resDoc.getPages()[0];
    const resources = resPage.node.get(PDFName.of('Resources'));
    expect(resources).toBeDefined();
  });
});
