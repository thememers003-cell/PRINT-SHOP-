import { describe, it, expect } from 'vitest';
import { getOrderTrackingLogic } from '../src/lib/tracking-service';

describe('Order Tracking Logic', () => {
  it('retrieves tracking data for valid Job ID PB-2026-000001', async () => {
    const data = await getOrderTrackingLogic('PB-2026-000001');
    expect(data.jobId).toBe('PB-2026-000001');
    expect(data.shopName).toBeDefined();
    expect(data.status).toBeDefined();
    expect(data.documents.length).toBeGreaterThan(0);
  });

  it('throws error for non-existent job ID', async () => {
    await expect(getOrderTrackingLogic('PB-9999-999999')).rejects.toThrow('Order not found');
  });
});

