const { execFile } = require('child_process');

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

async function test() {
  const jobs = await getPrinterJobs('EPSON L3250 Series');
  console.log('Current jobs in EPSON queue:', jobs);
}

test();

