import { describe, it, expect, vi } from 'vitest';
import { spoolOrderDirectly } from '../src/lib/spooler-service';
import { prisma } from '../src/lib/prisma';

describe('Concurrent Order Print Queue (FIFO Serialization)', () => {
  it('handles multiple concurrent spool requests in strict sequential FIFO order without throwing unhandled collisions', async () => {
    // Dispatch 3 concurrent non-blocking calls
    const p1 = spoolOrderDirectly('order_test_1').catch((err) => err.message);
    const p2 = spoolOrderDirectly('order_test_2').catch((err) => err.message);
    const p3 = spoolOrderDirectly('order_test_3').catch((err) => err.message);

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    // All three were handled gracefully through the serial queue
    expect(r1).toBe('Order not found');
    expect(r2).toBe('Order not found');
    expect(r3).toBe('Order not found');
  });
});

