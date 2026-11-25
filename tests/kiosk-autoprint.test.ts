import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { GET as kioskAuthGET } from '../src/app/api/auth/kiosk/route';
import { verifySession } from '../src/lib/session';
import { markAgentActive } from '../src/lib/agent-registry';
import { getShopDashboardData } from '../src/lib/shop-owner-service';

describe('Zero-Install Kiosk Auto-Login & Auto-Print Pipeline', () => {
  let shopId: string;
  const apiKey = `pb_live_kiosk_test_${Date.now()}`;

  beforeAll(async () => {
    const shop = await prisma.shop.create({
      data: {
        name: 'Kiosk Auto Print Test Shop',
        slug: `kiosk-test-${Date.now()}`,
        ownerName: 'Kiosk Tester',
        email: `kiosk-${Date.now()}@test.local`,
        mobile: '9876543210',
        address: 'Counter 1',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560001',
        apiKey,
        status: 'ACTIVE',
        printMode: 'AUTO',
      },
    });
    shopId = shop.id;
  });

  afterAll(async () => {
    if (shopId) {
      await prisma.shop.deleteMany({ where: { id: shopId } });
    }
  });

  it('rejects kiosk auto-login when API key is invalid', async () => {
    const req = new Request(`http://localhost:3000/api/auth/kiosk?shopId=${shopId}&key=wrong_key`);
    const res = await kioskAuthGET(req);
    expect(res.status).toBe(401);
  });

  it('authenticates valid kiosk key, sets signed session cookie, and redirects to dashboard', async () => {
    const req = new Request(`http://localhost:3000/api/auth/kiosk?shopId=${shopId}&key=${apiKey}`);
    const res = await kioskAuthGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain(`/dashboard?shopId=${shopId}&kiosk=1`);

    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('printbro_session=');

    const tokenMatch = setCookie.match(/printbro_session=([^;]+)/);
    expect(tokenMatch).not.toBeNull();
    const session = verifySession(decodeURIComponent(tokenMatch![1]));
    expect(session?.role).toBe('SHOP_OWNER');
    expect(session?.shopId).toBe(shopId);
  });

  it('exposes accurate agentOnline status in dashboard data', async () => {
    const before = await getShopDashboardData(shopId);
    expect(before.agentOnline).toBe(false);

    markAgentActive(shopId);
    const after = await getShopDashboardData(shopId);
    expect(after.agentOnline).toBe(true);
  });
});
