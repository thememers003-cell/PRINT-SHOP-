import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { GET } from '../src/app/api/files/[...path]/route';
import { prisma } from '../src/lib/prisma';
import { markAgentActive, isShopAgentOnline } from '../src/lib/agent-registry';

describe('Runtime File Serving API (/api/files/[...path])', () => {
  const testDir = path.join(process.cwd(), 'public', 'uploads', 'test-runtime-shop');
  const testFile = path.join(testDir, 'sample.pdf');
  const fallbackJobId = `PB-TEST-FALLBACK-${Date.now()}`;
  let createdShopId: string | null = null;
  let createdOrderId: string | null = null;

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testFile, Buffer.from('%PDF-1.4 runtime test'));

    const shop = await prisma.shop.create({
      data: {
        slug: `runtime-test-shop-${Date.now()}`,
        name: 'Runtime Test Shop',
        ownerName: 'Tester',
        email: `runtime-${Date.now()}@test.local`,
        mobile: '9999999999',
        address: 'Test',
        city: 'Test',
        state: 'KA',
        pinCode: '560001',
      },
    });
    createdShopId = shop.id;

    const order = await prisma.order.create({
      data: {
        jobId: fallbackJobId,
        shopId: shop.id,
        status: 'COMPLETED',
        documents: {
          create: {
            shopId: shop.id,
            fileKey: 'test_key',
            originalFilename: 'sample.pdf',
            mimeType: 'application/pdf',
            pageCount: 1,
            fileSize: 21,
            storageUrl: '/uploads/test-runtime-shop/sample.pdf',
          },
        },
      },
    });
    createdOrderId = order.id;
  });

  afterAll(async () => {
    if (createdOrderId) {
      await prisma.document.deleteMany({ where: { orderId: createdOrderId } }).catch(() => {});
      await prisma.order.deleteMany({ where: { id: createdOrderId } }).catch(() => {});
    }
    if (createdShopId) {
      await prisma.shop.deleteMany({ where: { id: createdShopId } }).catch(() => {});
    }
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('serves a newly written runtime upload file cleanly with application/pdf', async () => {
    const req = new Request('http://localhost/api/files/uploads/test-runtime-shop/sample.pdf');
    const res = await GET(req, {
      params: { path: ['uploads', 'test-runtime-shop', 'sample.pdf'] },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.toString('utf-8')).toContain('%PDF-1.4 runtime test');
  });

  it('falls back to order printReadyUrl/storageUrl when spooler-output copy is missing', async () => {
    const req = new Request(`http://localhost/api/files/spooler-output/order_${fallbackJobId}.pdf`);
    const res = await GET(req, {
      params: { path: ['spooler-output', `order_${fallbackJobId}.pdf`] },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.toString('utf-8')).toContain('%PDF-1.4 runtime test');
  });

  it('rejects disallowed roots and directory traversal attempts', async () => {
    const badRoot = await GET(new Request('http://localhost/api/files/prisma/dev.db'), {
      params: { path: ['prisma', 'dev.db'] },
    });
    expect(badRoot.status).toBe(400);

    const traversal = await GET(new Request('http://localhost/api/files/uploads/../dev.db'), {
      params: { path: ['uploads', '..', '..', 'package.json'] },
    });
    expect(traversal.status).toBe(403);
  });

  it('returns 404 when file does not exist', async () => {
    const missing = await GET(new Request('http://localhost/api/files/uploads/test-runtime-shop/nope.pdf'), {
      params: { path: ['uploads', 'test-runtime-shop', 'nope.pdf'] },
    });
    expect(missing.status).toBe(404);
  });

  it('tracks live agent polling activity accurately', () => {
    const fakeShopId = `shop_${Date.now()}`;
    expect(isShopAgentOnline(fakeShopId)).toBe(false);
    markAgentActive(fakeShopId);
    expect(isShopAgentOnline(fakeShopId)).toBe(true);
  });
});
