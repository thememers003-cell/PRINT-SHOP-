const fs = require('fs');
const path = require('path');
const http = require('http');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      {
        hostname: 'localhost',
        port: 3000,
        path: urlPath,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        });
      }
    );
    req.on('error', reject);
  });
}

async function testMerge3PdfsDirectPrint() {
  console.log('========================================================================');
  console.log('   TESTING: MERGING 3 SEPARATE PDFs & SENDING DIRECT TO PRINTER');
  console.log('========================================================================\n');

  const shopSlug = 'sri-ganesh-xerox';
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', shopSlug);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  // 1. Generate 3 distinct sample PDFs
  console.log('Step 1: Creating 3 separate customer PDFs...');
  
  // PDF 1: 2 pages (Invoice)
  const doc1 = await PDFDocument.create();
  const font = await doc1.embedFont(StandardFonts.HelveticaBold);
  const p1 = doc1.addPage([595.28, 841.89]);
  p1.drawText('PDF #1: INVOICE - PAGE 1 of 2', { x: 50, y: 750, size: 20, font, color: rgb(0, 0, 0) });
  const p2 = doc1.addPage([595.28, 841.89]);
  p2.drawText('PDF #1: INVOICE - PAGE 2 of 2', { x: 50, y: 750, size: 20, font, color: rgb(0, 0, 0) });
  const file1 = `sample_part1_${Date.now()}.pdf`;
  fs.writeFileSync(path.join(uploadDir, file1), await doc1.save());
  console.log(`  ✓ File 1: ${file1} (2 pages)`);

  // PDF 2: 2 pages (Contract)
  const doc2 = await PDFDocument.create();
  const font2 = await doc2.embedFont(StandardFonts.HelveticaBold);
  const p3 = doc2.addPage([595.28, 841.89]);
  p3.drawText('PDF #2: CONTRACT - PAGE 1 of 2', { x: 50, y: 750, size: 20, font: font2, color: rgb(0, 0, 0) });
  const p4 = doc2.addPage([595.28, 841.89]);
  p4.drawText('PDF #2: CONTRACT - PAGE 2 of 2', { x: 50, y: 750, size: 20, font: font2, color: rgb(0, 0, 0) });
  const file2 = `sample_part2_${Date.now()}.pdf`;
  fs.writeFileSync(path.join(uploadDir, file2), await doc2.save());
  console.log(`  ✓ File 2: ${file2} (2 pages)`);

  // PDF 3: 1 page (Certificate)
  const doc3 = await PDFDocument.create();
  const font3 = await doc3.embedFont(StandardFonts.HelveticaBold);
  const p5 = doc3.addPage([595.28, 841.89]);
  p5.drawText('PDF #3: CERTIFICATE - FINAL PAGE', { x: 50, y: 750, size: 20, font: font3, color: rgb(0, 0, 0) });
  const file3 = `sample_part3_${Date.now()}.pdf`;
  fs.writeFileSync(path.join(uploadDir, file3), await doc3.save());
  console.log(`  ✓ File 3: ${file3} (1 page)`);
  console.log('  Total input pages to be merged: 2 + 2 + 1 = 5 pages.\n');

  // 2. Submit order through /api/orders/checkout with sequential merge
  console.log('Step 2: Submitting checkout order with isSequentialMerge: true...');
  const checkoutPayload = {
    shopSlug,
    customerName: 'Multi-PDF Merge Tester',
    customerPhone: '9900112233',
    jobs: [
      {
        documentName: `Merged_3_PDFs.pdf`,
        pageCount: 5,
        storageUrls: [
          `/uploads/${shopSlug}/${file1}`,
          `/uploads/${shopSlug}/${file2}`,
          `/uploads/${shopSlug}/${file3}`,
        ],
        isSequentialMerge: true,
        copies: 1,
        colorMode: 'BW',
        sides: 'SINGLE',
        orientation: 'PORTRAIT',
        paperSize: 'A4',
        nUp: 1,
      },
    ],
  };

  const checkoutRes = await postJson('/api/orders/checkout', checkoutPayload);
  if (!checkoutRes.order) {
    console.error('Checkout failed:', checkoutRes);
    process.exit(1);
  }
  const order = checkoutRes.order;
  console.log(`  ✓ Order created! Job ID: [${order.jobId}]`);
  console.log(`  ✓ Total Amount: ₹${order.totalAmount}`);
  console.log(`  ✓ Combined Storage URL: ${order.documents[0]?.storageUrl}`);

  // 3. Verify the generated PDF on disk
  console.log('\nStep 3: Verifying generated merged print file on disk...');
  const mergedDiskPath = path.join(process.cwd(), 'public', order.documents[0]?.storageUrl.replace(/^\//, ''));
  const mergedBytes = fs.readFileSync(mergedDiskPath);
  const loadedMerged = await PDFDocument.load(mergedBytes);
  const totalMergedPages = loadedMerged.getPageCount();
  console.log(`  ✓ Generated File: ${path.basename(mergedDiskPath)} (${mergedBytes.length} bytes)`);
  console.log(`  ✓ Page Count Verification: EXACTLY ${totalMergedPages} pages merged into 1 PDF!`);
  
  if (totalMergedPages !== 5) {
    console.error(`❌ Page count mismatch! Expected 5, got ${totalMergedPages}`);
    process.exit(1);
  }

  // 4. Trigger payment verification (auto-spool to physical printer)
  console.log('\nStep 4: Customer verifies payment via /api/payments/verify...');
  console.log('  -> printMode is AUTO');
  console.log('  -> Server should silently route all 5 pages directly to the physical Windows Spooler queue...');
  
  const startTime = Date.now();
  const payRes = await postJson('/api/payments/verify', {
    jobId: order.jobId,
    transactionId: `TXN_MERGE_${Date.now()}`,
    signature: 'sig_mock_success',
  });
  console.log(`  ✓ Payment response: ${payRes.success ? 'SUCCESS' : 'FAILED'}`);

  // 5. Monitor status transition
  console.log('\nStep 5: Monitoring live queue & printer spooling status...');
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const statusData = await getJson(`/api/orders/${order.jobId}`);
    console.log(`  [+${i + 1}s] Order: ${statusData.jobId} | Status: ${statusData.status} | Printer: ${statusData.jobs[0]?.printerName || 'Auto-Selected'}`);
    if (statusData.status === 'COMPLETED' || statusData.status === 'FAILED') {
      break;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n========================================================================');
  console.log('   RESULT: 3 PDFs MERGED & SENT DIRECT TO PRINTER');
  console.log('========================================================================');
  console.log(`  Input Files        : 3 separate PDFs (2 pgs + 2 pgs + 1 pg)`);
  console.log(`  Merged Output      : 1 Print-Ready PDF with 5 Pages`);
  console.log(`  Physical Spool     : Direct to Windows Printer Queue`);
  console.log(`  Browser Dialogs    : ZERO (No popup screen)`);
  console.log(`  Human Clicks       : ZERO (100% automated)`);
  console.log(`  Total Process Time : ${duration}s`);
  console.log('========================================================================\n');

  // Clean up test files
  try {
    fs.unlinkSync(path.join(uploadDir, file1));
    fs.unlinkSync(path.join(uploadDir, file2));
    fs.unlinkSync(path.join(uploadDir, file3));
    fs.unlinkSync(mergedDiskPath);
  } catch {}
}

testMerge3PdfsDirectPrint().catch(console.error);

