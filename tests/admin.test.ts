import { describe, it, expect } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { createShopLogic, getPlatformMetrics } from '../src/lib/admin-service';

describe('Super Admin Operations', () => {
  it('creates a new shop with unique slug and default pricing', async () => {
    const slug = `test-shop-${Date.now()}`;
    const result = await createShopLogic({
      name: 'Modern Xerox Center',
      slug,
      ownerName: 'Vikas Gupta',
      email: `${slug}@printbro.online`,
      mobile: '9898989898',
      address: 'Near Tech Park Gate 1',
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500081',
      commissionRate: 7.5,
      commissionType: 'PERCENT',
      printMode: 'MANUAL',
    });

    expect(result.shop.slug).toBe(slug);
    expect(result.shop.apiKey).toBeDefined();

    // Verify pricing defaults created
    const pricing = await prisma.shopPricing.findUnique({
      where: { shopId: result.shop.id },
    });
    expect(pricing).toBeDefined();
    expect(pricing?.bwSingle).toBe(2.0);
  });

  it('aggregates platform metrics correctly', async () => {
    const metrics = await getPlatformMetrics();
    expect(metrics.totalShops).toBeGreaterThan(0);
    expect(metrics.activeShops).toBeDefined();
    expect(typeof metrics.totalPlatformRevenue).toBe('number');
  });
});
