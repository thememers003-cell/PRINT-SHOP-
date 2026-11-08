import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { calculateJobPrice, calculateOrderTotal } from '../src/lib/pricing';
import { createOrderCheckoutLogic } from '../src/lib/order-service';

describe('Custom Pricing Matrix Engine & Live Updates', () => {
  let testShop: any;

  beforeAll(async () => {
    testShop = await prisma.shop.create({
      data: {
        name: 'Pricing Test Xerox',
        slug: `pricing-test-${Date.now()}`,
        ownerName: 'Pricing Owner',
        email: `pricing-${Date.now()}@test.com`,
        mobile: '9876543210',
        address: '456 Market St',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560001',
        apiKey: `pricing-key-${Date.now()}`,
        status: 'ACTIVE',
        printMode: 'MANUAL',
        pricing: {
          create: {
            bwSingle: 2.0,
            bwDuplex: 1.5,
            colorSingle: 10.0,
            colorDuplex: 9.0,
            a3Multiplier: 2.0,
            a5Multiplier: 0.8,
            letterMultiplier: 1.0,
            legalMultiplier: 1.2,
            minOrderAmount: 5.0,
            serviceFee: 0.0,
          },
        },
      },
      include: { pricing: true },
    });
  });

  afterAll(async () => {
    if (testShop?.id) {
      await prisma.document.deleteMany({ where: { shopId: testShop.id } });
      await prisma.order.deleteMany({ where: { shopId: testShop.id } });
      await prisma.shopPricing.deleteMany({ where: { shopId: testShop.id } });
      await prisma.shop.deleteMany({ where: { id: testShop.id } });
    }
  });

  it('calculates baseline pricing accurately', () => {
    const rates = testShop.pricing;
    const config = {
      pageCount: 10,
      copies: 1,
      colorMode: 'BW' as const,
      sides: 'DUPLEX' as const,
      paperSize: 'A4' as const,
      nUp: 1,
    };

    const breakdown = calculateJobPrice(config, rates);
    // 10 pages duplex = 10 printed sides = 5 physical sheets
    // Rate = 1.5 per side * 10 = ₹15.00
    expect(breakdown.printedSides).toBe(10);
    expect(breakdown.printedSheets).toBe(5);
    expect(breakdown.total).toBe(15.0);
  });

  it('updates pricing live in database and immediately affects calculations', async () => {
    // Shopkeeper customizes rates:
    // bwSingle -> ₹3.00, bwDuplex -> ₹2.50, colorSingle -> ₹15.00, serviceFee -> ₹3.00
    const updatedPricing = await prisma.shopPricing.update({
      where: { shopId: testShop.id },
      data: {
        bwSingle: 3.0,
        bwDuplex: 2.5,
        colorSingle: 15.0,
        colorDuplex: 12.0,
        serviceFee: 3.0,
      },
    });

    expect(updatedPricing.bwSingle).toBe(3.0);
    expect(updatedPricing.bwDuplex).toBe(2.5);
    expect(updatedPricing.serviceFee).toBe(3.0);

    // New order calculation with custom rates
    const jobConfig = {
      pageCount: 10,
      copies: 1,
      colorMode: 'BW' as const,
      sides: 'DUPLEX' as const,
      paperSize: 'A4' as const,
      nUp: 1,
    };

    const job = calculateJobPrice(jobConfig, updatedPricing);
    // 10 sides * 2.50 = 25.00
    expect(job.total).toBe(25.0);

    const orderTotal = calculateOrderTotal([jobConfig], updatedPricing, updatedPricing.serviceFee);
    // 25.00 + 3.00 service fee = 28.00
    expect(orderTotal.finalAmount).toBe(28.0);
  });

  it('applies minimum order floor when order subtotal is below minimum threshold', async () => {
    await prisma.shopPricing.update({
      where: { shopId: testShop.id },
      data: {
        minOrderAmount: 10.0,
        serviceFee: 0.0,
      },
    });

    const currentRates = (await prisma.shopPricing.findUnique({
      where: { shopId: testShop.id },
    }))!;

    // 1 single page B&W at ₹3.00
    const jobConfig = {
      pageCount: 1,
      copies: 1,
      colorMode: 'BW' as const,
      sides: 'SINGLE' as const,
      paperSize: 'A4' as const,
      nUp: 1,
    };

    const orderTotal = calculateOrderTotal([jobConfig], currentRates, currentRates.serviceFee);
    expect(orderTotal.subtotal).toBe(3.0);
    expect(orderTotal.minOrderFloorApplied).toBe(true);
    expect(orderTotal.finalAmount).toBe(10.0);
  });

  it('updates hardware print mode between MANUAL and AUTO', async () => {
    const updatedShopAuto = await prisma.shop.update({
      where: { id: testShop.id },
      data: { printMode: 'AUTO' },
    });
    expect(updatedShopAuto.printMode).toBe('AUTO');

    const updatedShopManual = await prisma.shop.update({
      where: { id: testShop.id },
      data: { printMode: 'MANUAL' },
    });
    expect(updatedShopManual.printMode).toBe('MANUAL');
  });
});

