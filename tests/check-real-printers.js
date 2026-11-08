const ptp = require('pdf-to-printer');
const { execFile } = require('child_process');

async function checkPrinters() {
  console.log('--- Querying Installed Printers ---');
  execFile('powershell.exe', [
    '-NoProfile',
    '-Command',
    'Get-Printer | Select-Object Name, PrinterStatus, PortName, DriverName, Shared | Format-Table -AutoSize | Out-String'
  ], (err, stdout) => {
    if (err) console.error(err);
    else console.log(stdout);
  });
}

checkPrinters();

