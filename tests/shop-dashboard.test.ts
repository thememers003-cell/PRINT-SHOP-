import { describe, it, expect } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { dispatchManualPrintLogic, getShopDashboardData } from '../src/lib/shop-owner-service';

describe('Shop Owner POS Dashboard Service', () => {
  it('retrieves scoped shop dashboard data and orders', async () => {
    const shop = await prisma.shop.findUnique({
      where: { slug: 'sri-ganesh-xerox' },
    });
    expect(shop).toBeDefined();

    const data = await getShopDashboardData(shop!.id);
    expect(data.shop.name).toBe('Sri Ganesh Xerox & Stationers');
    expect(Array.isArray(data.orders)).toBe(true);
    expect(data.metrics.todayEarnings).toBeDefined();
  });

  it('dispatches manual print and transitions order to QUEUED', async () => {
    const order = await prisma.order.findUnique({
      where: { jobId: 'PB-2026-000001' },
    });
    expect(order).toBeDefined();

    const result = await dispatchManualPrintLogic(order!.id, order!.shopId);
    expect(result.order.status).toBe('QUEUED');
  });
});
