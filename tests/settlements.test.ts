import { describe, it, expect } from 'vitest';
import { computeShopSettlement, generateSettlementCsv } from '../src/lib/settlement';

describe('Super Admin Settlements & Financial Reports', () => {
  it('correctly calculates platform commission and net shop earnings', () => {
    const result = computeShopSettlement({
      totalGross: 2000,
      commissionRate: 5.0, // 5%
      commissionType: 'PERCENT',
    });

    expect(result.platformCommission).toBe(100);
    expect(result.shopEarnings).toBe(1900);
  });

  it('correctly calculates flat commission rate', () => {
    const result = computeShopSettlement({
      totalGross: 500,
      commissionRate: 20.0, // ₹20 flat
      commissionType: 'FLAT',
    });

    expect(result.platformCommission).toBe(20);
    expect(result.shopEarnings).toBe(480);
  });

  it('formats ledger records into compliant CSV', () => {
    const records = [
      {
        shopName: 'Sri Ganesh Xerox',
        totalOrders: 10,
        totalGross: 1200,
        platformCommission: 60,
        shopPayout: 1140,
        status: 'SETTLED',
        settledDate: '2026-11-04',
      },
    ];

    const csv = generateSettlementCsv(records);
    expect(csv).toContain('Shop Name,Total Orders,Gross GMV (INR),Platform Commission (INR),Net Shop Payout (INR),Status,Settlement Date');
    expect(csv).toContain('"Sri Ganesh Xerox",10,1200.00,60.00,1140.00,SETTLED,2026-11-04');
  });
});
