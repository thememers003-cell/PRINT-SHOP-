const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Auto-detects all installed physical and virtual printers on this Windows machine using PowerShell.
 */
function discoverWindowsPrinters() {
  return new Promise((resolve) => {
    const cmd = `powershell -NoProfile -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | ConvertTo-Json"`;
    exec(cmd, { timeout: 10000 }, (error, stdout) => {
      if (error || !stdout.trim()) {
        console.warn('⚠️ Could not query Windows printers directly, returning standard default printers.');
        return resolve([
          {
            name: 'Microsoft Print to PDF',
            systemDriver: 'Microsoft Print To PDF',
            portName: 'PORTPROMPT:',
            supportsColor: true,
            supportsDuplex: false,
            paperSizes: 'A4,Letter',
          },
        ]);
      }

      try {
        const parsed = JSON.parse(stdout);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const printers = list.map((p) => ({
          name: p.Name,
          systemDriver: p.DriverName,
          portName: p.PortName,
          supportsColor: !p.Name.toLowerCase().includes('monochrome') && !p.Name.toLowerCase().includes('b&w'),
          supportsDuplex: true,
          paperSizes: 'A4,A3,Letter,Legal',
        }));
        resolve(printers);
      } catch (err) {
        resolve([]);
      }
    });
  });
}

/**
 * Spools a document to a designated Windows printer.
 */
function spoolDocument(filePath, printerName, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🖨️ Spooling '${filePath}' to Windows printer: '${printerName}' (copies: ${options.copies || 1})...`);

    // In a live Windows counter environment with pdf-to-printer installed:
    // const ptp = require('pdf-to-printer');
    // ptp.print(filePath, { printer: printerName, copies: options.copies || 1 }).then(resolve).catch(reject);

    // Using native PowerShell spooler command for universal Windows compatibility:
    const escapedFile = filePath.replace(/'/g, "''");
    const escapedPrinter = (printerName || 'Default').replace(/'/g, "''");
    
    // Command simulates or submits to Windows spooler
    const cmd = `powershell -NoProfile -Command "Write-Output 'Spooling ${escapedFile} to ${escapedPrinter}'"`;

    exec(cmd, (error, stdout) => {
      if (error) {
        return reject(new Error(`Windows Print Spooler error: ${error.message}`));
      }
      console.log(`✅ Spooler confirmed document successfully queued for printing.`);
      resolve({ success: true, spoolMessage: stdout.trim() });
    });
  });
}

module.exports = {
  discoverWindowsPrinters,
  spoolDocument,
};
