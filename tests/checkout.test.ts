import { describe, it, expect } from 'vitest';
import { generateJobId } from '../src/lib/job-id';
import { createOrderCheckoutLogic } from '../src/lib/order-service';

describe('Order Creation & Payment Checkout', () => {
  it('generates compliant Job ID PB-YYYY-XXXXXX', () => {
    const id = generateJobId(1);
    expect(id).toMatch(/^PB-\d{4}-\d{6}$/);
    expect(id).toBe('PB-2026-000001');
  });

  it('creates order in PAYMENT_PENDING state and recalculates price independently', async () => {
    const result = await createOrderCheckoutLogic({
      shopSlug: 'sri-ganesh-xerox',
      customerName: 'Aarav Patel',
      customerPhone: '9876543210',
      jobs: [
        {
          documentName: 'notes.pdf',
          pageCount: 4,
          fileSize: 1024,
          colorMode: 'BW',
          sides: 'SINGLE',
          paperSize: 'A4',
          copies: 1,
          nUp: 1,
        },
      ],
    });

    expect(result.order.jobId).toMatch(/^PB-\d{4}-\d{6}$/);
    expect(result.order.status).toBe('PAYMENT_PENDING');
    expect(result.order.paymentStatus).toBe('INITIATED');
    // 4 pages B&W single @ ₹2 = ₹8 + ₹2 shop service fee = ₹10
    expect(result.order.totalAmount).toBe(10);
  });
});
