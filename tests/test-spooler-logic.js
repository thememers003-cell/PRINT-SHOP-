const { discoverWindowsPrinters, isHardwarePrinter } = require('../agent/spooler');

async function testSpoolerLogic() {
  console.log('Testing hardware printer discovery...');
  console.log('Is OneNote hardware?:', isHardwarePrinter('OneNote for Windows 10'));
  console.log('Is Print to PDF hardware?:', isHardwarePrinter('Microsoft Print to PDF'));
  console.log('Is Fax hardware?:', isHardwarePrinter('Fax'));
  console.log('Is EPSON L3250 hardware?:', isHardwarePrinter('EPSON L3250 Series'));

  const discovered = await discoverWindowsPrinters();
  console.log('Discovered hardware printers count:', discovered.length);
  console.log('Hardware printers:', discovered.map(p => `${p.name} (Default: ${p.isDefault})`));

  if (discovered.some(p => p.name.includes('OneNote') || p.name.includes('Fax') || p.name.includes('PDF'))) {
    throw new Error('Virtual printer detected!');
  }

  const epson = discovered.find(p => p.name.includes('EPSON'));
  if (!epson) {
    throw new Error('EPSON L3250 Series was not discovered!');
  }
  console.log('Hardware printer detection test PASSED!');
}

testSpoolerLogic().catch(console.error);

