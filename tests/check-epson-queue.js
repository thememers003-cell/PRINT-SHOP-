const { execFile } = require('child_process');

execFile('powershell.exe', [
  '-NoProfile',
  '-Command',
  'Get-PrintJob -PrinterName "EPSON L3250 Series" | Select-Object Id, DocumentName, JobStatus, PagesPrinted, TotalPages | Format-Table -AutoSize | Out-String'
], (err, stdout) => {
  if (err) console.error(err);
  else console.log(stdout);
});

