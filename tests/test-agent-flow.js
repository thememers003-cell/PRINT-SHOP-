const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const ptp = require('pdf-to-printer');

async function testAgentFlow() {
  console.log('Testing authentic document preparation in agent flow...');

  // 1. Prepare sample PNG
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const rawBuffer = Buffer.from(pngBase64, 'base64');

  // 2. Wrap image to PDF using the exact logic from agent.js
  const pdfDoc = await PDFDocument.create();
  const embeddedImg = await pdfDoc.embedPng(rawBuffer);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const margin = 36;
  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;
  const dims = embeddedImg.scaleToFit(maxW, maxH);

  page.drawImage(embeddedImg, {
    x: (pageWidth - dims.width) / 2,
    y: (pageHeight - dims.height) / 2,
    width: dims.width,
    height: dims.height,
  });

  const pdfBytes = await pdfDoc.save();
  const tempPath = path.join(__dirname, 'test_spool_output.pdf');
  fs.writeFileSync(tempPath, Buffer.from(pdfBytes));

  console.log('Generated authentic PDF from image, size:', pdfBytes.length);
  console.log('Temporary PDF written to:', tempPath);

  // 3. Check installed printers
  const printers = await ptp.getPrinters();
  console.log('Installed Windows printers:', printers.map(p => p.name).join(', '));

  // Verify printer detection
  const hasPrinters = printers.length > 0;
  console.log('Printer discovery verification:', hasPrinters ? 'PASSED' : 'FAILED');

  // Clean up test file
  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
}

testAgentFlow().catch(console.error);
