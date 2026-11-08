import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '@/app/api/agent/download/route';
import { prisma } from '@/lib/prisma';

describe('Agent Download API', () => {
  let testShopId: string;

  beforeEach(async () => {
    const shop = await prisma.shop.upsert({
      where: { slug: 'test-download-shop' },
      update: {},
      create: {
        name: 'Test Download Shop',
        ownerName: 'Test Owner',
        email: 'test@example.com',
        slug: 'test-download-shop',
        address: '123 Test Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560001',
        mobile: '9988776655',
        apiKey: 'pb_live_test_download_key_123',
        printMode: 'AUTO',
      },
    });
    testShopId = shop.id;
  });

  it('generates a pre-configured .bat agent launcher', async () => {
    const req = new Request(`http://localhost:3000/api/agent/download?shopId=${testShopId}&format=bat`);
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/x-bat');
    expect(res.headers.get('Content-Disposition')).toContain('PrintBro_test-download-shop.bat');

    const body = await res.text();
    expect(body).toContain('pb_live_test_download_key_123');
    expect(body).toContain('Test Download Shop');
  });

  it('serves PrintBro-Agent.exe for format=exe', async () => {
    const req = new Request(`http://localhost:3000/api/agent/download?shopId=${testShopId}&format=exe`);
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.microsoft.portable-executable');
    expect(res.headers.get('Content-Disposition')).toContain('.exe');
  });

  it('returns 400 if shopId is missing', async () => {
    const req = new Request('http://localhost:3000/api/agent/download');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
