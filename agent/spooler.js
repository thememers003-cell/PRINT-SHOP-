const ptp = require('pdf-to-printer');

/**
 * Auto-detects all installed physical and virtual printers on this Windows machine using pdf-to-printer.
 */
async function discoverWindowsPrinters() {
  try {
    const list = await ptp.getPrinters();
    return list.map((p) => ({
      name: p.name,
      systemDriver: p.deviceId || p.name,
      portName: 'USB001',
      supportsColor: !p.name.toLowerCase().includes('monochrome') && !p.name.toLowerCase().includes('b&w'),
      supportsDuplex: true,
      paperSizes: p.paperSizes ? p.paperSizes.join(',') : 'A4,Letter',
    }));
  } catch (error) {
    console.warn('⚠️ ptp.getPrinters error, falling back:', error.message);
    return [
      {
        name: 'Microsoft Print to PDF',
        systemDriver: 'Microsoft Print To PDF',
        portName: 'PORTPROMPT:',
        supportsColor: true,
        supportsDuplex: false,
        paperSizes: 'A4,Letter',
      },
    ];
  }
}

/**
 * Spools a document to an actual Windows printer via pdf-to-printer.
 */
async function spoolDocument(filePath, targetPrinterName, options = {}) {
  console.log(`🖨️ Preparing to spool '${filePath}'...`);

  // Query installed Windows printers
  let installedPrinters = [];
  try {
    installedPrinters = await ptp.getPrinters();
  } catch (e) {
    console.error('Could not get printers list:', e.message);
  }

  const installedNames = installedPrinters.map((p) => p.name);
  console.log(`📋 Available Windows printers on this PC:`, installedNames.join(', '));

  let chosenPrinter = targetPrinterName;

  // Check if requested printer exists
  if (!installedNames.includes(chosenPrinter)) {
    // Prioritize active EPSON printer, then Canon/HP/MF280, then default
    const physical = 
      installedNames.find((name) => name.toLowerCase().includes('epson')) ||
      installedNames.find((name) => name.toLowerCase().includes('canon')) ||
      installedNames.find((name) => name.toLowerCase().includes('hp')) ||
      installedNames.find((name) => name.toLowerCase().includes('mf280'));

    let defaultP = null;
    try {
      defaultP = await ptp.getDefaultPrinter();
    } catch (e) {}

    chosenPrinter = physical || (defaultP ? defaultP.name : installedNames[0]);
    console.log(`ℹ️ Target '${targetPrinterName}' not found on this PC. Routing to real printer: '${chosenPrinter}'`);
  }

  console.log(`🚀 SENDING PRINT COMMAND TO WINDOWS SPOOLER: Printer '${chosenPrinter}' (copies: ${options.copies || 1})...`);

  const printOptions = {
    printer: chosenPrinter,
  };

  if (options.copies && options.copies > 1) {
    printOptions.copies = options.copies;
  }

  // Direct call to Windows Spooler via SumatraPDF / pdf-to-printer
  await ptp.print(filePath, printOptions);

  console.log(`🎉 SUCCESS: Document spooled to '${chosenPrinter}'! Check your printer queue.`);
  return { success: true, printer: chosenPrinter };
}

module.exports = {
  discoverWindowsPrinters,
  spoolDocument,
};
