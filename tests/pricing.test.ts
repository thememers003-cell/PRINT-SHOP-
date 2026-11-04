import { describe, it, expect } from 'vitest';
import { calculateJobPrice, calculateOrderTotal, type PrintConfig, type ShopPricingRates } from '../src/lib/pricing';

describe('Pricing Engine', () => {
  const sampleRates: ShopPricingRates = {
    bwSingle: 2,
    bwDuplex: 1.5, // per side (₹3 per sheet)
    colorSingle: 10,
    colorDuplex: 9, // per side (₹18 per sheet)
    a3Multiplier: 2.0,
    a5Multiplier: 0.8,
    letterMultiplier: 1.0,
    legalMultiplier: 1.2,
    minOrderAmount: 5,
  };

  it('calculates 3-page B&W single sided (2 copies)', () => {
    const result = calculateJobPrice({
      pageCount: 3,
      copies: 2,
      colorMode: 'BW',
      sides: 'SINGLE',
      paperSize: 'A4',
      nUp: 1,
    }, sampleRates);

    // 3 pages * 1 side * ₹2 * 2 copies = ₹12
    expect(result.printedSheets).toBe(3);
    expect(result.printedSides).toBe(3);
    expect(result.total).toBe(12);
  });

  it('calculates 3-page B&W duplex (odd page duplex calculation)', () => {
    const result = calculateJobPrice({
      pageCount: 3,
      copies: 1,
      colorMode: 'BW',
      sides: 'DUPLEX',
      paperSize: 'A4',
      nUp: 1,
    }, sampleRates);

    // 3 pages duplex = 2 physical sheets, 3 printed sides @ ₹1.5/side = ₹4.5
    expect(result.printedSheets).toBe(2);
    expect(result.printedSides).toBe(3);
    expect(result.total).toBe(4.5);
  });

  it('calculates 4-page N-up (2 pages per sheet) B&W single sided', () => {
    const result = calculateJobPrice({
      pageCount: 4,
      copies: 1,
      colorMode: 'BW',
      sides: 'SINGLE',
      paperSize: 'A4',
      nUp: 2,
    }, sampleRates);

    // 4 document pages / 2 per sheet = 2 printed sheets @ ₹2 = ₹4
    expect(result.printedSheets).toBe(2);
    expect(result.total).toBe(4);
  });

  it('applies paper size multiplier (A3 = 2.0x)', () => {
    const result = calculateJobPrice({
      pageCount: 1,
      copies: 1,
      colorMode: 'COLOR',
      sides: 'SINGLE',
      paperSize: 'A3',
      nUp: 1,
    }, sampleRates);

    // 1 page color single = ₹10 * 2.0 = ₹20
    expect(result.total).toBe(20);
  });

  it('enforces minimum order amount and adds service fee', () => {
    const orderTotal = calculateOrderTotal(
      [{ pageCount: 1, copies: 1, colorMode: 'BW', sides: 'SINGLE', paperSize: 'A4', nUp: 1 }],
      sampleRates,
      2 // service fee ₹2
    );
    // Base job: ₹2, min order floor is ₹5. Final amount = max(2, 5) + 2 = ₹7
    expect(orderTotal.subtotal).toBe(2);
    expect(orderTotal.serviceFee).toBe(2);
    expect(orderTotal.finalAmount).toBe(7);
  });
});

