import { describe, it, expect } from 'vitest';
import { getShopBySlugLogic } from '../src/lib/customer-service';

describe('Customer Shop Portal Tenant Guard', () => {
  it('returns shop configuration for valid active slug', async () => {
    const data = await getShopBySlugLogic('sri-ganesh-xerox');
    expect(data.shop).toBeDefined();
    expect(data.shop.slug).toBe('sri-ganesh-xerox');
    expect(data.shop.pricing).toBeDefined();
    expect(data.shop.status).toBe('ACTIVE');
  });

  it('rejects nonexistent slug with error', async () => {
    await expect(getShopBySlugLogic('nonexistent-shop-404')).rejects.toThrow('Shop not found');
  });
});

