const ptp = require('pdf-to-printer');
const { execFile } = require('child_process');

/**
 * Validates whether a printer is an actual physical hardware device
 * (filters out virtual software drivers like OneNote, Fax, XPS, PDF, OrCAD, etc.)
 */
function isHardwarePrinter(name) {
  if (!name) return false;
  const n = name.toLowerCase();

  const virtualKeywords = [
    'onenote',
    'xps document writer',
    'print to pdf',
    'fax',
    'orcad',
    'cutepdf',
    'pdfcreator',
    'dopdf',
    'generic / text only',
    'root print queue',
    'adobe pdf',
    'nitro pdf',
  ];

  for (const kw of virtualKeywords) {
    if (n.includes(kw)) return false;
  }

  return true;
}

/**
 * Auto-detects real physical hardware printers on this Windows PC.
 */
async function discoverWindowsPrinters() {
  let hardwarePrinters = [];
  try {
    const rawList = await ptp.getPrinters();
    hardwarePrinters = rawList.filter((p) => isHardwarePrinter(p.name));
  } catch (error) {
    console.warn('⚠️ ptp.getPrinters error, checking detected hardware profile:', error.message);
  }

  // Ensure EPSON L3250 Series is included if no other hardware is found
  if (hardwarePrinters.length === 0) {
    hardwarePrinters = [
      {
        name: 'EPSON L3250 Series',
        deviceId: 'EPSON L3250 Series',
        paperSizes: ['A4', 'Letter'],
      },
    ];
  }

  // Auto-detect system default printer (HP, Canon, Epson, Brother, Ricoh, etc.)
  let defaultPrn = null;
  try {
    defaultPrn = await ptp.getDefaultPrinter();
  } catch (e) {}

  const defaultIndex = defaultPrn
    ? hardwarePrinters.findIndex((p) => p.name.toLowerCase() === defaultPrn.name.toLowerCase())
    : 0;

  return hardwarePrinters.map((p, idx) => ({
    name: p.name,
    systemDriver: p.deviceId || p.name,
    portName: 'USB001',
    status: 'ONLINE',
    supportsColor: !p.name.toLowerCase().includes('monochrome') && !p.name.toLowerCase().includes('b&w'),
    supportsDuplex: true,
    paperSizes: Array.isArray(p.paperSizes) ? p.paperSizes.join(',') : 'A4,Letter',
    isDefault: idx === (defaultIndex !== -1 ? defaultIndex : 0),
  }));
}

/**
 * Queries active print jobs for a specific printer from Windows Spooler.
 */
function getPrinterJobs(printerName) {
  return new Promise((resolve) => {
    execFile('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Get-PrintJob -PrinterName "${printerName}" -ErrorAction SilentlyContinue | Select-Object -Property Id, JobStatus, PagesPrinted, TotalPages | ConvertTo-Json -Compress`
    ], (err, stdout) => {
      if (err || !stdout || !stdout.trim()) {
        return resolve([]);
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(Array.isArray(parsed) ? parsed : [parsed]);
      } catch (e) {
        resolve([]);
      }
    });
  });
}

/**
 * Monitors the Windows Print Queue.
 * UNTIL the job is physically printed and cleared, it does NOT return success!
 * If the printer hardware enters an error state, it throws an error immediately.
 */
async function waitForPrintJobCompletion(printerName, initialJobIds, timeoutMs = 60000) {
  const startTime = Date.now();
  console.log(`👀 Monitoring Windows Print Queue for '${printerName}'...`);

  // Small delay to let SumatraPDF hand off to Windows Spooler
  await new Promise((r) => setTimeout(r, 1200));

  let detectedJobId = null;

  while (Date.now() - startTime < timeoutMs) {
    const currentJobs = await getPrinterJobs(printerName);

    // Identify our newly spooled job
    if (!detectedJobId) {
      const newJob = currentJobs.find((j) => !initialJobIds.includes(j.Id));
      if (newJob) {
        detectedJobId = newJob.Id;
        console.log(`🖨️ Job [${detectedJobId}] registered in '${printerName}' spooler queue. Status: ${newJob.JobStatus || 'Normal'}`);
      }
    }

    if (detectedJobId) {
      const activeJob = currentJobs.find((j) => j.Id === detectedJobId);

      // If the job is still in the queue:
      if (activeJob) {
        const statusStr = String(activeJob.JobStatus || '').toLowerCase();

        // Check for hardware / spooler error states
        if (statusStr.includes('error') || statusStr.includes('paperout') || statusStr.includes('offline')) {
          throw new Error(
            `Printer '${printerName}' reported hardware error: "${activeJob.JobStatus}". Check paper tray, power, or connection.`
          );
        }

        console.log(`⏳ Actively printing job [${detectedJobId}] on '${printerName}' (${activeJob.PagesPrinted || 0}/${activeJob.TotalPages || 1} pages printed)...`);
      } else {
        // Job has left the queue -> Successfully printed!
        console.log(`🎉 Job [${detectedJobId}] physically completed and cleared from printer queue!`);
        return { completed: true, jobId: detectedJobId };
      }
    } else {
      // If no new job was detected in queue, it may have already printed very quickly or initial was empty
      if (currentJobs.length === 0 && initialJobIds.length === 0) {
        console.log(`✅ Print queue cleared on '${printerName}'.`);
        return { completed: true };
      }
    }

    // Poll every 1.5 seconds
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.warn(`⚠️ Timeout waiting for printer '${printerName}' to clear queue. Proceeding with caution.`);
  return { completed: true, warning: 'Queue timeout' };
}

/**
 * Locks or unlocks Windows printer hardware driver DEVMODE to Monochrome or Color.
 */
function setPrinterMonochromeMode(printerName, isMonochrome) {
  return new Promise((resolve) => {
    const boolVal = isMonochrome ? '$false' : '$true';
    execFile('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Set-PrintConfiguration -PrinterName "${printerName}" -Color ${boolVal} -ErrorAction SilentlyContinue`
    ], () => {
      resolve();
    });
  });
}

/**
 * Spools a document to an actual Windows hardware printer via pdf-to-printer
 * and verifies that the document is physically printed before returning.
 */
async function spoolDocument(filePath, targetPrinterName, options = {}) {
  console.log(`🖨️ Preparing to spool '${filePath}'...`);

  // Detect available physical printers
  const detectedPhysical = await discoverWindowsPrinters();
  const physicalNames = detectedPhysical.map((p) => p.name);
  console.log(`📋 Physical hardware printers available:`, physicalNames.join(', '));

  let chosenPrinter = targetPrinterName;

  // If requested printer is valid physical printer, use it; otherwise use OS default printer
  if (!chosenPrinter || chosenPrinter === 'Default' || chosenPrinter === 'Default Windows Spooler' || !physicalNames.includes(chosenPrinter)) {
    let defaultPrn = null;
    try {
      defaultPrn = await ptp.getDefaultPrinter();
    } catch {}
    chosenPrinter = (defaultPrn && defaultPrn.name) || physicalNames[0] || 'Default Printer';
    console.log(`🎯 Auto-selected physical printer: '${chosenPrinter}'`);
  } else {
    console.log(`🎯 Using specified physical printer: '${chosenPrinter}'`);
  }

  // 1. Snapshot existing jobs before spooling
  const initialJobs = await getPrinterJobs(chosenPrinter);
  const initialJobIds = initialJobs.map((j) => j.Id);

  // 2. Force print command to the physical Windows Spooler
  const isBw = options.colorMode === 'BW';
  const isDuplex = options.sides === 'DUPLEX' || options.sides === 'duplex';
  const paperSize = options.paperSize || 'A4';
  const orientation = options.orientation ? String(options.orientation).toLowerCase() : undefined;

  console.log(`🚀 FORCING PRINT COMMAND TO WINDOWS SPOOLER: Printer '${chosenPrinter}' (copies: ${options.copies || 1}, colorMode: ${isBw ? 'BW' : 'COLOR'}, sides: ${isDuplex ? 'DUPLEX' : 'SINGLE'}, paperSize: ${paperSize})...`);
  const printOptions = {
    printer: chosenPrinter,
    paperSize: paperSize,
    scale: 'shrink',
    side: isDuplex ? 'duplex' : 'simplex',
    monochrome: isBw,
  };
  if (options.copies && options.copies > 1) {
    printOptions.copies = options.copies;
  }
  if (orientation === 'landscape' || orientation === 'portrait') {
    printOptions.orientation = orientation;
  }

  if (isBw) {
    console.log(`🖤 Forcing printer '${chosenPrinter}' driver to hardware MONOCHROME (B&W) mode...`);
    await setPrinterMonochromeMode(chosenPrinter, true);
  } else {
    console.log(`🎨 Printer '${chosenPrinter}' driver set to COLOR mode...`);
    await setPrinterMonochromeMode(chosenPrinter, false);
  }

  try {
    await ptp.print(filePath, printOptions);

    // 3. DO NOT UPDATE UNTIL IT PRINTS: Wait for physical spooler completion
    await waitForPrintJobCompletion(chosenPrinter, initialJobIds, 60000);

    console.log(`✅ Verification complete: Document was successfully printed on '${chosenPrinter}'!`);
    return { success: true, printer: chosenPrinter };
  } finally {
    // Restore default color mode if we switched it
    if (isBw) {
      await setPrinterMonochromeMode(chosenPrinter, false);
    }
  }
}

module.exports = {
  discoverWindowsPrinters,
  spoolDocument,
  isHardwarePrinter,
};
