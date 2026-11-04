import { describe, it, expect } from 'vitest';
import { prisma } from '../src/lib/prisma';

describe('Database Schema & Multi-Tenant Models', () => {
  it('should query shops successfully', async () => {
    const shops = await prisma.shop.findMany();
    expect(Array.isArray(shops)).toBe(true);
  });
});

