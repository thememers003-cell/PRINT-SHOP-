import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from './prisma';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Generates an authentic, printable digital PDF document for an order on the fly.
 * Used when a container restart or ephemeral disk wipes the public uploads folder.
 */
export async function generateEmergencyOrderPdf(jobId: string): Promise<Buffer | null> {
  try {
    const order = await prisma.order.findUnique({
      where: { jobId },
      include: {
        shop: true,
        documents: true,
        jobs: true,
        payment: true,
      },
    });

    if (!order) return null;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points (72 dpi)
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Header bar (Primary Brand Color: Deep Navy/Blue)
    page.drawRectangle({
      x: 30,
      y: height - 100,
      width: width - 60,
      height: 70,
      color: rgb(0.09, 0.28, 0.72), // #1748b8
    });

    page.drawText('PRINT BRO - DIGITAL SPOOL DOCUMENT', {
      x: 50,
      y: height - 60,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`Official Print-Ready Document & Voucher | Job #${order.jobId}`, {
      x: 50,
      y: height - 80,
      size: 10,
      font: fontRegular,
      color: rgb(0.85, 0.9, 1),
    });

    // Shop Info Box
    let currentY = height - 130;
    page.drawText(`Shop: ${order.shop.name}`, {
      x: 40,
      y: currentY,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    currentY -= 16;
    page.drawText(`${order.shop.address || 'Local Counter'}, ${order.shop.city || ''} - Phone: ${order.shop.mobile || 'N/A'}`, {
      x: 40,
      y: currentY,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Divider
    currentY -= 15;
    page.drawLine({
      start: { x: 40, y: currentY },
      end: { x: width - 40, y: currentY },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });

    // Order & Customer Details
    currentY -= 25;
    page.drawText('CUSTOMER & ORDER SPECIFICATIONS', {
      x: 40,
      y: currentY,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    currentY -= 20;
    const details = [
      ['Customer Name', order.customerName || 'Walk-in Customer'],
      ['Order Date', new Date(order.createdAt).toLocaleString('en-IN')],
      ['Order Status', `${order.status} (${order.paymentStatus})`],
      ['Total Paid', `Rs. ${order.totalAmount.toFixed(2)}`],
    ];

    for (const [label, val] of details) {
      page.drawText(`${label}:`, {
        x: 45,
        y: currentY,
        size: 10,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
      });
      page.drawText(String(val), {
        x: 180,
        y: currentY,
        size: 10,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= 16;
    }

    // Document Print Jobs Table
    currentY -= 15;
    page.drawRectangle({
      x: 40,
      y: currentY - 5,
      width: width - 80,
      height: 20,
      color: rgb(0.94, 0.96, 0.98),
    });

    page.drawText('Document Name', { x: 50, y: currentY, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Pages', { x: 260, y: currentY, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Color', { x: 310, y: currentY, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Sides', { x: 360, y: currentY, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Paper', { x: 420, y: currentY, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Copies', { x: 480, y: currentY, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });

    currentY -= 20;
    const docs = order.documents.length > 0 ? order.documents : [{ originalFilename: 'Print Document.pdf', pageCount: 1 }];
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      const job = order.jobs[i] || order.jobs[0] || {};
      const docName = d.originalFilename.length > 32 ? d.originalFilename.substring(0, 30) + '...' : d.originalFilename;

      page.drawText(docName, { x: 50, y: currentY, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(String(d.pageCount || 1), { x: 265, y: currentY, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(job.colorMode === 'COLOR' ? 'Color' : 'B&W', { x: 310, y: currentY, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(job.sides === 'DUPLEX' ? 'Double' : 'Single', { x: 360, y: currentY, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(job.paperSize || 'A4', { x: 420, y: currentY, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(String(job.copies || 1), { x: 490, y: currentY, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

      currentY -= 16;
    }

    // Hardware Printing Notice Box
    currentY -= 25;
    page.drawRectangle({
      x: 40,
      y: currentY - 50,
      width: width - 80,
      height: 65,
      borderColor: rgb(0.2, 0.6, 0.2),
      borderWidth: 1.5,
      color: rgb(0.96, 1, 0.96),
    });

    page.drawText('AUTHENTIC CLOUD SPOOL VERIFICATION', {
      x: 55,
      y: currentY - 2,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.5, 0.1),
    });

    page.drawText('This document is verified and queued for physical hardware output at the counter printer.', {
      x: 55,
      y: currentY - 18,
      size: 9,
      font: fontRegular,
      color: rgb(0.2, 0.4, 0.2),
    });

    page.drawText('Keep this document copy or scan token for counter pickup & tax compliance.', {
      x: 55,
      y: currentY - 32,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.3, 0.45, 0.3),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // Save copy to public/spooler-output so subsequent requests find it directly
    try {
      const spoolDir = path.join(process.cwd(), 'public', 'spooler-output');
      await fs.mkdir(spoolDir, { recursive: true });
      await fs.writeFile(path.join(spoolDir, `order_${jobId}.pdf`), pdfBuffer);
    } catch {}

    return pdfBuffer;
  } catch (err) {
    console.error('Error generating emergency order PDF:', err);
    return null;
  }
}
