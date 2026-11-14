#!/usr/bin/env node

/**
 * Print Bro – Headless Windows Local Print Agent
 * Connects physical Xerox and desktop printers to the Print Bro cloud.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { discoverWindowsPrinters, spoolDocument } = require('./spooler');

// Parse CLI flags or env vars
const args = process.argv.slice(2);
let apiKey = process.env.PRINTBRO_SHOP_API_KEY || 'pb_live_ganesh_xerox_secret_key_2026';
let serverUrl = process.env.PRINTBRO_SERVER_URL || 'http://localhost:3000';
let explicitPrinter = process.env.PRINTBRO_PRINTER_NAME || null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--key' && args[i + 1]) {
    apiKey = args[i + 1];
  }
  if (args[i] === '--server' && args[i + 1]) {
    serverUrl = args[i + 1];
  }
  if (args[i] === '--printer' && args[i + 1]) {
    explicitPrinter = args[i + 1];
  }
}

console.log('======================================================');
console.log('   PRINT BRO – WINDOWS LOCAL PRINT AGENT v1.0.0      ');
console.log('======================================================');
console.log(`Server Target : ${serverUrl}`);
console.log(`Shop API Key  : ${apiKey.substring(0, 8)}...`);
console.log(`Platform OS   : ${process.platform} (${process.arch})`);
console.log('------------------------------------------------------');

// Helper for HTTP requests
function apiRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, serverUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const payload = body ? JSON.stringify(body) : null;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'x-shop-api-key': apiKey,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.error || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function registerPrinters() {
  try {
    console.log('🔍 Discovering local Windows printers...');
    const printers = await discoverWindowsPrinters();
    console.log(`📋 Found ${printers.length} local printer(s):`, printers.map((p) => p.name).join(', '));

    console.log('📡 Syncing printers with Print Bro cloud...');
    const res = await apiRequest('POST', '/api/agent/printers', { printers });
    console.log(`✅ Successfully synced ${res.registeredCount} printer(s) to shop dashboard.`);
  } catch (err) {
    console.error('❌ Printer discovery/sync failed:', err.message);
  }
}

async function sendHeartbeat() {
  try {
    await apiRequest('POST', '/api/agent/heartbeat');
  } catch (err) {
    // Ignore transient heartbeat failures
  }
}

// Helper to parse page range strings like "1-3, 5"
function parsePageRange(rangeStr, totalPages) {
  if (!rangeStr || rangeStr.toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const indices = new Set();
  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
          indices.add(p - 1);
        }
      }
    } else {
      const num = Number(trimmed);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        indices.add(num - 1);
      }
    }
  }
  const result = Array.from(indices).sort((a, b) => a - b);
  return result.length > 0 ? result : Array.from({ length: totalPages }, (_, i) => i);
}

// Download raw document bytes from storageUrl or local public folder
async function downloadFileBuffer(storageUrl, serverTarget) {
  const isLocalServer =
    serverTarget.includes('localhost') || serverTarget.includes('127.0.0.1');

  // Only read from local public/ folder when targeting localhost directly
  if (isLocalServer) {
    const cleanPath = storageUrl.startsWith('/') ? storageUrl.slice(1) : storageUrl;
    const localFilePath = path.join(process.cwd(), 'public', cleanPath);
    if (fs.existsSync(localFilePath)) {
      console.log(`📁 Loading local document directly: ${localFilePath}`);
      return fs.readFileSync(localFilePath);
    }
  }

  // Otherwise download via HTTP/HTTPS
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(storageUrl, serverTarget);
    console.log(`🌐 Downloading document from: ${fullUrl.href}`);
    const client = fullUrl.protocol === 'https:' ? https : http;

    client.get(fullUrl.href, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Handle redirect
        return downloadFileBuffer(res.headers.location, serverTarget).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download document: HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

/**
 * Prepares the actual customer document for printing.
 * Converts JPG/PNG to PDF, or slices PDF pages if custom pageRange is set.
 */
async function fetchAndPrepareDocument(job, doc, cfg, serverTarget) {
  const rawBuffer = await downloadFileBuffer(doc.storageUrl, serverTarget);

  // If it's already an imposed / transformed print-ready PDF, return directly
  const isPdf = rawBuffer.slice(0, 5).toString('ascii').startsWith('%PDF-');
  if (isPdf) {
    if (doc.storageUrl && doc.storageUrl.includes('print_ready_')) {
      return rawBuffer;
    }
  }

  const isImage =
    !isPdf &&
    ((doc.mimeType && doc.mimeType.startsWith('image/')) ||
      doc.filename.toLowerCase().endsWith('.png') ||
      doc.filename.toLowerCase().endsWith('.jpg') ||
      doc.filename.toLowerCase().endsWith('.jpeg'));

  if (isImage) {
    console.log(`🖼️ Converting image (${doc.filename}) into print-ready A4 PDF...`);
    const pdfDoc = await PDFDocument.create();
    const isPng = doc.filename.toLowerCase().endsWith('.png') || doc.mimeType === 'image/png';
    let embeddedImg;

    try {
      embeddedImg = isPng ? await pdfDoc.embedPng(rawBuffer) : await pdfDoc.embedJpg(rawBuffer);
    } catch (err) {
      // Fallback try opposite embedder in case file extension differed from magic bytes
      try {
        embeddedImg = isPng ? await pdfDoc.embedJpg(rawBuffer) : await pdfDoc.embedPng(rawBuffer);
      } catch (e2) {
        throw new Error(`Failed to embed image into PDF: ${err.message}`);
      }
    }

    // Standard A4: 595.28 x 841.89 points
    const isImageLandscape = embeddedImg.width > embeddedImg.height;
    const isLandscape =
      cfg.orientation === 'LANDSCAPE' ||
      (cfg.orientation === 'AUTO' && isImageLandscape) ||
      (!cfg.orientation && isImageLandscape);
    const pageWidth = isLandscape ? 841.89 : 595.28;
    const pageHeight = isLandscape ? 595.28 : 841.89;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Scale image nicely with safe 24pt (~8.5mm) margins
    const margin = 24;
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
    return Buffer.from(pdfBytes);
  }

  // If it's an already imposed / transformed print-ready PDF, return directly
  if (doc.storageUrl && doc.storageUrl.includes('print_ready_')) {
    return rawBuffer;
  }

  // If it's a raw customer PDF: check if pageRange slicing is needed
  if (cfg.pageRange && cfg.pageRange !== 'all') {
    try {
      console.log(`✂️ Slicing PDF page range: ${cfg.pageRange}...`);
      const srcPdf = await PDFDocument.load(rawBuffer, { ignoreEncryption: true });
      const destPdf = await PDFDocument.create();
      const totalPages = srcPdf.getPageCount();
      const pageIndices = parsePageRange(cfg.pageRange, totalPages);
      const copiedPages = await destPdf.copyPages(srcPdf, pageIndices);
      copiedPages.forEach((p) => destPdf.addPage(p));
      const slicedBytes = await destPdf.save();
      return Buffer.from(slicedBytes);
    } catch (sliceErr) {
      console.warn(`⚠️ Page slicing warning (${sliceErr.message}), spooling full PDF.`);
      return rawBuffer;
    }
  }

  // Original unmodified customer PDF
  return rawBuffer;
}

async function pollAndProcessJobs() {
  try {
    const res = await apiRequest('GET', '/api/agent/jobs');
    if (!res.job) {
      return; // No jobs queued
    }

    const { job } = res;
    console.log(`\n📥 NEW PRINT JOB CLAIMED: [${job.jobId}]`);
    console.log(`   Customer : ${job.customerName}`);
    console.log(`   Files    : ${job.documents.map((d) => d.filename).join(', ')}`);

    // If checkout generated a unified master print-ready PDF for all documents, spool it once
    const masterUrl = job.jobs?.[0]?.printReadyUrl;
    const hasMasterOrderPdf = masterUrl && masterUrl.includes('print_ready_order_');
    const docsToPrint = hasMasterOrderPdf
      ? [
          {
            id: job.documents[0]?.id || 'master',
            filename: `${job.jobId}_merged.pdf`,
            storageUrl: masterUrl,
            mimeType: 'application/pdf',
          },
        ]
      : job.documents;

    // Process each document in the job
    for (let i = 0; i < docsToPrint.length; i++) {
      const doc = docsToPrint[i];
      const cfg = job.jobs[i] || job.jobs[0];
      const tempPath = path.join(__dirname, `temp_${job.jobId}_${i}.pdf`);

      try {
        console.log(`📄 Preparing authentic document: ${doc.filename}...`);
        const pdfBuffer = await fetchAndPrepareDocument(job, doc, cfg, serverUrl);
        fs.writeFileSync(tempPath, pdfBuffer);

        const targetPrinter = explicitPrinter || cfg.targetPrinterName;
        await spoolDocument(tempPath, targetPrinter, {
          copies: cfg.copies,
          paperSize: cfg.paperSize,
          colorMode: cfg.colorMode,
          sides: cfg.sides,
          orientation: cfg.orientation,
        });

        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch (err) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        console.error(`❌ Process/Spool failed for ${doc.filename}:`, err.message);
        await apiRequest('POST', '/api/agent/jobs', {
          orderId: job.orderId,
          status: 'FAILED',
          errorMessage: err.message,
        });
        return;
      }
    }

    // Report completed status back to cloud
    console.log(`✅ Job [${job.jobId}] successfully completed and reported to cloud.\n`);
    await apiRequest('POST', '/api/agent/jobs', {
      orderId: job.orderId,
      status: 'COMPLETED',
    });
  } catch (err) {
    // Polling retry
  }
}

async function startAgent() {
  // 1. Initial printer discovery & registration
  await registerPrinters();

  // 2. Heartbeat timer (every 30 seconds)
  setInterval(sendHeartbeat, 30000);

  // 3. Job polling loop (every 3 seconds)
  console.log('⚡ Print Agent daemon active. Listening for cloud print jobs...');
  setInterval(pollAndProcessJobs, 3000);
}

if (require.main === module) {
  startAgent();
}

module.exports = {
  startAgent,
  discoverWindowsPrinters,
};
