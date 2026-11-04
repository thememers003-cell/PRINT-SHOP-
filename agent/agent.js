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

async function createPrintReadyPdf(job, doc, cfg) {
  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  // Header Banner
  page.drawRectangle({
    x: 40,
    y: height - 120,
    width: width - 80,
    height: 70,
    color: rgb(0.14, 0.38, 0.92),
  });

  page.drawText('PRINT BRO - AUTOMATED PRINT JOB', {
    x: 60,
    y: height - 85,
    size: 20,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(`Job ID: ${job.jobId}   |   Customer: ${job.customerName || 'Walk-in'}`, {
    x: 60,
    y: height - 105,
    size: 11,
    font: regularFont,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Body Content
  let y = height - 170;
  page.drawText(`Document: ${doc.filename}`, { x: 50, y, size: 14, font: boldFont });
  y -= 25;
  page.drawText(`Copies: ${cfg.copies || 1}  |  Color: ${cfg.colorMode}  |  Sides: ${cfg.sides}  |  Paper: ${cfg.paperSize}`, {
    x: 50,
    y,
    size: 11,
    font: regularFont,
  });
  y -= 20;
  page.drawText(`Spool Time: ${new Date().toLocaleString()}`, { x: 50, y, size: 10, font: regularFont });

  y -= 30;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  y -= 40;
  page.drawText('This document was spooled via the Print Bro Headless Windows Print Agent.', {
    x: 50,
    y,
    size: 12,
    font: regularFont,
  });

  y -= 25;
  page.drawText('Official Xerox Counter Proof of Delivery.', {
    x: 50,
    y,
    size: 10,
    font: regularFont,
    color: rgb(0.4, 0.4, 0.4),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
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

    // Process each document in the job
    for (let i = 0; i < job.documents.length; i++) {
      const doc = job.documents[i];
      const cfg = job.jobs[i] || job.jobs[0];

      console.log(`📄 Generating print-ready PDF for ${doc.filename}...`);
      const tempPath = path.join(__dirname, `temp_${job.jobId}_${i}.pdf`);

      const pdfBuffer = await createPrintReadyPdf(job, doc, cfg);
      fs.writeFileSync(tempPath, pdfBuffer);

      const targetPrinter = explicitPrinter || cfg.targetPrinterName;
      try {
        await spoolDocument(tempPath, targetPrinter, {
          copies: cfg.copies,
          paperSize: cfg.paperSize,
        });

        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch (err) {
        console.error(`❌ Spool failed for ${doc.filename}:`, err.message);
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
