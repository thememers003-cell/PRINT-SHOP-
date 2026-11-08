import { describe, it, expect, vi } from 'vitest';
import { isHardwarePrinter, discoverLocalPrinters, spoolOrderDirectly } from '../src/lib/spooler-service';

describe('Spooler Service (Hardware Silent Printing)', () => {
  it('correctly filters out virtual printers and detects hardware', () => {
    expect(isHardwarePrinter('OneNote for Windows 10')).toBe(false);
    expect(isHardwarePrinter('Microsoft Print to PDF')).toBe(false);
    expect(isHardwarePrinter('Fax')).toBe(false);
    expect(isHardwarePrinter('EPSON L3250 Series')).toBe(true);
    expect(isHardwarePrinter('HP LaserJet Pro M404dn')).toBe(true);
    expect(isHardwarePrinter('Canon G3000 series')).toBe(true);
  });

  it('exports discoverLocalPrinters returning valid printer profiles', async () => {
    const printers = await discoverLocalPrinters();
    expect(Array.isArray(printers)).toBe(true);
    expect(printers.length).toBeGreaterThan(0);
    expect(printers[0]).toHaveProperty('name');
    expect(printers[0]).toHaveProperty('status');
  }, 15000);

  it('fails gracefully if orderId does not exist', async () => {
    await expect(spoolOrderDirectly('non_existent_order_id')).rejects.toThrow('Order not found');
  });
});
