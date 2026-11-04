import { describe, it, expect } from 'vitest';
import { matchPrinterForJob, PrinterCandidate } from '../src/lib/printer-matcher';

describe('Smart Printer Matcher & Auto-Print Pipeline', () => {
  const shopPrinters: PrinterCandidate[] = [
    {
      id: 'p1',
      name: 'Canon LBP 2900 (B&W Laser)',
      supportsColor: false,
      supportsDuplex: true,
      paperSizes: 'A4,Letter',
      isDefault: true,
    },
    {
      id: 'p2',
      name: 'HP InkTank 415 (Color & Photo)',
      supportsColor: true,
      supportsDuplex: false,
      paperSizes: 'A4,A3,Letter',
      isDefault: false,
    },
  ];

  it('routes B&W A4 job to dedicated B&W laser printer to preserve color ink', () => {
    const matched = matchPrinterForJob(
      { colorMode: 'BW', paperSize: 'A4' },
      shopPrinters
    );
    expect(matched?.id).toBe('p1');
    expect(matched?.name).toContain('Canon');
  });

  it('routes Color A4 job to Color printer', () => {
    const matched = matchPrinterForJob(
      { colorMode: 'COLOR', paperSize: 'A4' },
      shopPrinters
    );
    expect(matched?.id).toBe('p2');
    expect(matched?.name).toContain('HP InkTank');
  });

  it('routes A3 job to printer that supports A3 paper format', () => {
    const matched = matchPrinterForJob(
      { colorMode: 'BW', paperSize: 'A3' },
      shopPrinters
    );
    expect(matched?.id).toBe('p2'); // HP InkTank supports A3
  });

  it('returns default printer if no specific match exists', () => {
    const matched = matchPrinterForJob(
      { colorMode: 'BW', paperSize: 'LEGAL' },
      shopPrinters
    );
    expect(matched?.id).toBe('p1'); // Falls back to default
  });
});

