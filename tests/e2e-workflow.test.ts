import { describe, it, expect } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { createShopLogic } from '../src/lib/admin-service';
import { getShopBySlugLogic } from '../src/lib/customer-service';
import { createOrderCheckoutLogic } from '../src/lib/order-service';
import { claimPendingJobLogic, reportJobStatusLogic } from '../src/lib/agent-service';
import { getOrderTrackingLogic } from '../src/lib/tracking-service';
import { getSettlementLedgerData } from '../src/lib/settlement';

describe('Print Bro Complete Multi-Shop SaaS E2E Lifecycle', () => {
  const testSlug = `e2e-xpress-print-${Date.now()}`;
  let createdShop: any;
  let createdOrder: any;

  it('Step 1: Super Admin onboards new Xerox shop with dedicated URL', async () => {
    const result = await createShopLogic({
      name: 'E2E Express Xerox Hub',
      slug: testSlug,
      ownerName: 'Sunil Rao',
      email: `${testSlug}@printbro.online`,
      mobile: '9876500000',
      address: 'Shop 4, ITPL Main Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pinCode: '560066',
      commissionRate: 10.0, // 10% platform commission
      commissionType: 'PERCENT',
      printMode: 'AUTO',
    });

    createdShop = result.shop;
    expect(createdShop.slug).toBe(testSlug);
    expect(createdShop.apiKey).toBeDefined();
    expect(createdShop.pricing).toBeDefined();
  });

  it('Step 2: Customer accesses dedicated shop portal and reviews pricing', async () => {
    const data = await getShopBySlugLogic(testSlug);
    expect(data.shop.name).toBe('E2E Express Xerox Hub');
    expect(data.shop.pricing.bwSingle).toBe(2.0);
  });

  it('Step 3: Customer uploads documents and completes checkout', async () => {
    const checkoutResult = await createOrderCheckoutLogic({
      shopSlug: testSlug,
      customerName: 'Aditi Verma',
      customerPhone: '9988776655',
      notes: 'Please staple',
      jobs: [
        {
          documentName: 'syllabus.pdf',
          pageCount: 10,
          colorMode: 'BW',
          sides: 'DUPLEX', // 10 pages duplex = 5 sheets, 10 sides @ ₹1.5 = ₹15
          paperSize: 'A4',
          copies: 1,
          nUp: 1,
        },
      ],
    });

    createdOrder = checkoutResult.order;
    expect(createdOrder.jobId).toMatch(/^PB-\d{4}-\d{6}$/);
    expect(createdOrder.totalAmount).toBe(15);
    expect(createdOrder.platformCommission).toBe(1.5); // 10% of 15
    expect(createdOrder.shopEarnings).toBe(13.5);
  });

  it('Step 4: Customer verifies payment via gateway (triggers Auto-Print queue)', async () => {
    const updated = await prisma.order.update({
      where: { id: createdOrder.id },
      data: {
        status: 'QUEUED',
        paymentStatus: 'SUCCESS',
        payment: {
          update: {
            status: 'SUCCESS',
            transactionId: 'TXN_E2E_VERIFIED',
          },
        },
        jobs: {
          updateMany: {
            where: { orderId: createdOrder.id },
            data: { printStatus: 'QUEUED' },
          },
        },
      },
    });

    expect(updated.status).toBe('QUEUED');
    expect(updated.paymentStatus).toBe('SUCCESS');
  });

  it('Step 5: Local Windows Print Agent claims job and spools to physical printer', async () => {
    const claim = await claimPendingJobLogic(createdShop.apiKey);
    expect(claim.job).toBeDefined();
    expect(claim.job?.orderId).toBe(createdOrder.id);
    expect(claim.job?.status).toBe('PRINTING');

    // Agent executes print and reports COMPLETED
    const report = await reportJobStatusLogic(createdShop.apiKey, {
      orderId: createdOrder.id,
      status: 'COMPLETED',
    });
    expect(report.success).toBe(true);
    expect(report.status).toBe('COMPLETED');
  });

  it('Step 6: Customer live tracking displays completed status and receipt', async () => {
    const tracking = await getOrderTrackingLogic(createdOrder.jobId);
    expect(tracking.status).toBe('COMPLETED');
    expect(tracking.paymentStatus).toBe('SUCCESS');
    expect(tracking.shopName).toBe('E2E Express Xerox Hub');
  });

  it('Step 7: Super Admin ledger reflects earnings, commission and pending settlement', async () => {
    const { shopLedgers } = await getSettlementLedgerData();
    const ledger = shopLedgers.find((l) => l.slug === testSlug);

    expect(ledger).toBeDefined();
    expect(ledger?.totalOrders).toBe(1);
    expect(ledger?.totalGross).toBe(15);
    expect(ledger?.platformCommission).toBe(1.5);
    expect(ledger?.pendingBalance).toBe(13.5);
  });
});

