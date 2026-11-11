import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { GET } from '../src/app/api/files/[...path]/route';

describe('Runtime File Serving API (/api/files/[...path])', () => {
  const testDir = path.join(process.cwd(), 'public', 'uploads', 'test-runtime-shop');
  const testFile = path.join(testDir, 'sample.pdf');

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testFile, Buffer.from('%PDF-1.4 runtime test'));
  });

  afterAll(async () => {
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
});

