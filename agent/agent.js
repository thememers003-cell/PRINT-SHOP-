#!/usr/bin/env node

/**
 * Print Bro – Headless Windows Local Print Agent
 * Connects physical Xerox and desktop printers to the Print Bro cloud.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { discoverWindowsPrinters, spoolDocument } = require('./spooler');

// Parse CLI flags or env vars
const args = process.argv.slice(2);
let apiKey = process.env.PRINTBRO_SHOP_API_KEY || 'pb_live_ganesh_xerox_secret_key_2026';
let serverUrl = process.env.PRINTBRO_SERVER_URL || 'http://localhost:3000';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--key' && args[i + 1]) {
    apiKey = args[i + 1];
  }
  if (args[i] === '--server' && args[i + 1]) {
    serverUrl = args[i + 1];
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
    console.log('🔍 Discovering local Windows printers via PowerShell...');
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

      console.log(`📄 Printing document: ${doc.filename} -> Printer: '${cfg.targetPrinterName}' (${cfg.copies} copies)`);

      // Mock local print file path
      const tempPath = path.join(__dirname, `temp_${job.jobId}_${i}.pdf`);
      fs.writeFileSync(tempPath, '%PDF-1.4 Mock Print Ready PDF Content');

      try {
        await spoolDocument(tempPath, cfg.targetPrinterName, { copies: cfg.copies });
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
    console.log(`✅ Job [${job.jobId}] successfully completed and reported to cloud.`);
    await apiRequest('POST', '/api/agent/jobs', {
      orderId: job.orderId,
      status: 'COMPLETED',
    });
  } catch (err) {
    // Background polling catch
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

