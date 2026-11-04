import { prisma } from './prisma';
import { generateJobId } from './job-id';
import { calculateOrderTotal, PrintConfig } from './pricing';
import { initiatePaymentOrder } from './payment';

export interface CheckoutJobInput {
  documentName: string;
  pageCount: number;
  fileSize?: number;
  copies?: number;
  colorMode?: 'BW' | 'COLOR';
  sides?: 'SINGLE' | 'DUPLEX';
  orientation?: 'PORTRAIT' | 'LANDSCAPE' | 'AUTO';
  paperSize?: 'A4' | 'A3' | 'A5' | 'LETTER' | 'LEGAL';
  pageRange?: string;
  nUp?: number;
}

export interface CheckoutInput {
  shopSlug: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  gateway?: 'PHONEPE' | 'RAZORPAY' | 'MOCK';
  jobs: CheckoutJobInput[];
}

export async function createOrderCheckoutLogic(input: CheckoutInput) {
  const shop = await prisma.shop.findUnique({
    where: { slug: input.shopSlug },
    include: { pricing: true },
  });

  if (!shop) {
    throw new Error(`Shop with slug '${input.shopSlug}' not found.`);
  }

  if (shop.status !== 'ACTIVE') {
    throw new Error('This shop is currently inactive or suspended.');
  }

  if (!shop.pricing) {
    throw new Error('Shop pricing configuration is missing.');
  }

  if (!input.jobs || input.jobs.length === 0) {
    throw new Error('At least one document is required for checkout.');
  }

  // 1. Authoritative Server-Side Price Calculation
  const printConfigs: PrintConfig[] = input.jobs.map((job) => ({
    pageCount: Math.max(1, job.pageCount),
    copies: job.copies && job.copies > 0 ? job.copies : 1,
    colorMode: job.colorMode || 'BW',
    sides: job.sides || 'SINGLE',
    paperSize: job.paperSize || 'A4',
    nUp: job.nUp || 1,
  }));

  const pricingResult = calculateOrderTotal(
    printConfigs,
    shop.pricing,
    shop.pricing.serviceFee || 0
  );

  const totalAmount = pricingResult.finalAmount;

  // 2. Commission Calculation
  let platformCommission = 0;
  if (shop.commissionType === 'FLAT') {
    platformCommission = shop.commissionRate;
  } else {
    // PERCENT
    platformCommission = Number(((totalAmount * shop.commissionRate) / 100).toFixed(2));
  }
  const shopEarnings = Number(Math.max(0, totalAmount - platformCommission).toFixed(2));

  // 3. Unique Sequence-based Job ID
  const orderCount = await prisma.order.count();
  const sequence = orderCount + 1;
  const jobId = generateJobId(sequence);

  // 4. Atomic Database Transaction
  const order = await prisma.order.create({
    data: {
      jobId,
      shopId: shop.id,
      customerName: input.customerName || 'Walk-in Customer',
      customerPhone: input.customerPhone,
      notes: input.notes,
      status: 'PAYMENT_PENDING',
      totalAmount,
      platformCommission,
      shopEarnings,
      paymentStatus: 'INITIATED',
      payment: {
        create: {
          gateway: input.gateway || 'MOCK',
          amount: totalAmount,
          currency: 'INR',
          status: 'INITIATED',
        },
      },
      documents: {
        create: input.jobs.map((job, idx) => ({
          shopId: shop.id,
          fileKey: `doc_${jobId}_${idx + 1}`,
          originalFilename: job.documentName,
          mimeType: 'application/pdf',
          pageCount: job.pageCount,
          fileSize: job.fileSize || 0,
          storageUrl: `/uploads/${shop.slug}/${job.documentName}`,
        })),
      },
    },
    include: {
      documents: true,
      payment: true,
    },
  });

  // Create associated PrintJobs
  for (let i = 0; i < input.jobs.length; i++) {
    const jobInput = input.jobs[i];
    const doc = order.documents[i];

    await prisma.printJob.create({
      data: {
        orderId: order.id,
        documentId: doc.id,
        copies: jobInput.copies || 1,
        colorMode: jobInput.colorMode || 'BW',
        sides: jobInput.sides || 'SINGLE',
        orientation: jobInput.orientation || 'PORTRAIT',
        paperSize: jobInput.paperSize || 'A4',
        pageRange: jobInput.pageRange || 'all',
        nUp: jobInput.nUp || 1,
        printStatus: 'PENDING',
      },
    });
  }

  // 5. Initiate Payment
  const paymentDetails = await initiatePaymentOrder({
    orderId: order.id,
    jobId: order.jobId,
    amount: totalAmount,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    gateway: input.gateway,
  });

  return { order, paymentDetails, pricingBreakdown: pricingResult };
}
