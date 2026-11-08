const { PDFDocument, PageSizes, rgb, StandardFonts } = require('pdf-lib');
const { generatePrintReadyPdf } = require('../src/lib/pdf-processor');

async function testNUp() {
  console.log('--- Testing N-up (6 pages per sheet) Imposition ---');

  // 1. Create a sample 6-page PDF
  const srcDoc = await PDFDocument.create();
  const font = await srcDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 1; i <= 6; i++) {
    const page = srcDoc.addPage([595.28, 841.89]);
    page.drawText(`Sample Document - Page ${i}`, {
      x: 150,
      y: 700,
      size: 24,
      font,
      color: rgb(0.1, 0.2, 0.8),
    });
    page.drawRectangle({
      x: 50,
      y: 100,
      width: 495,
      height: 550,
      borderColor: rgb(0.3, 0.3, 0.3),
      borderWidth: 2,
    });
  }

  const srcBytes = await srcDoc.save();
  console.log('Original PDF: 6 pages, size:', srcBytes.length);

  // 2. Generate 6-up imposed PDF
  const nUpBuffer = await generatePrintReadyPdf(Buffer.from(srcBytes), {
    nUp: 6,
    pageRange: 'all',
  });

  const resultDoc = await PDFDocument.load(nUpBuffer);
  console.log('Resulting N-up PDF page count:', resultDoc.getPageCount());
  console.log('Sheet dimensions:', resultDoc.getPage(0).getSize());

  if (resultDoc.getPageCount() !== 1) {
    throw new Error(`Expected 1 sheet for 6-up on 6 pages, got ${resultDoc.getPageCount()}`);
  }

  console.log('✅ N-up 6 pages per sheet successfully verified!');
}

testNUp().catch(console.error);

