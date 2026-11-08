import { prisma } from './prisma';
import { generateJobId } from './job-id';
import { calculateOrderTotal, PrintConfig } from './pricing';
import { initiatePaymentOrder } from './payment';
import { generatePrintReadyPdf } from './pdf-processor';
import { PDFDocument } from 'pdf-lib';
import { promises as fs } from 'fs';
import path from 'path';

export interface CheckoutJobInput {
  documentName: string;
  pageCount: number;
  fileSize?: number;
  storageUrl?: string;
  storageUrls?: string[]; // Multiple photos/PDFs combined
  isSequentialMerge?: boolean; // Sequential merge into 1 multi-page document
  mimeType?: string;
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
  let sequence = orderCount + 1;
  let jobId = generateJobId(sequence);
  while (await prisma.order.findUnique({ where: { jobId } })) {
    sequence++;
    jobId = generateJobId(sequence);
  }

  // 4. Pre-process documents: apply N-up imposition (e.g. 6 pages per sheet), page slicing, or image-to-PDF conversion
  const processedDocs = [];
  for (let idx = 0; idx < input.jobs.length; idx++) {
    const job = input.jobs[idx];
    let storageUrl = job.storageUrl || `/uploads/${shop.slug}/${job.documentName}`;
    let mimeType = job.mimeType || (job.documentName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    let pageCount = Math.max(1, job.pageCount);
    let fileSize = job.fileSize || 0;

    if (job.storageUrls && job.storageUrls.length > 0) {
      try {
        const rawBuffers: Buffer[] = [];
        for (const u of job.storageUrls) {
          const p = path.join(process.cwd(), 'public', u.replace(/^\//, ''));
          const b = await fs.readFile(p);
          rawBuffers.push(b);
        }

        const transformedBuffer = await generatePrintReadyPdf(rawBuffers, {
          nUp: job.isSequentialMerge ? 1 : (job.nUp || Math.min(9, job.storageUrls.length)),
          isSequentialMerge: job.isSequentialMerge ?? (job.nUp === 1),
          isGrayscale: job.colorMode === 'BW',
          orientation: job.orientation,
          paperSize: job.paperSize,
        });

        const uniqueReadyName = `print_ready_merged_${Date.now()}_${idx + 1}.pdf`;
        const targetDir = path.join(process.cwd(), 'public', 'uploads', shop.slug);
        await fs.mkdir(targetDir, { recursive: true });
        const targetPath = path.join(targetDir, uniqueReadyName);

        await fs.writeFile(targetPath, transformedBuffer);

        storageUrl = `/uploads/${shop.slug}/${uniqueReadyName}`;
        mimeType = 'application/pdf';
        fileSize = transformedBuffer.length;

        const loadedTransformed = await PDFDocument.load(transformedBuffer, { ignoreEncryption: true });
        pageCount = loadedTransformed.getPageCount();
      } catch (procErr) {
        console.warn('Multi-image imposition processing error:', procErr);
      }
    } else if (storageUrl.startsWith('/uploads/')) {
      const relPath = storageUrl.replace(/^\//, '');
      const localFilePath = path.join(process.cwd(), 'public', relPath);

      try {
        const fileExists = await fs.stat(localFilePath).then(() => true).catch(() => false);
        if (fileExists) {
          const rawBuffer = await fs.readFile(localFilePath);
          const needsTransform =
            (job.nUp && job.nUp > 1) ||
            (job.pageRange && job.pageRange !== 'all') ||
            job.colorMode === 'BW' ||
            job.orientation === 'LANDSCAPE' ||
            !rawBuffer.slice(0, 5).toString('ascii').startsWith('%PDF-');

          if (needsTransform) {
            const transformedBuffer = await generatePrintReadyPdf(rawBuffer, {
              nUp: job.nUp || 1,
              pageRange: job.pageRange,
              isGrayscale: job.colorMode === 'BW',
              orientation: job.orientation,
              paperSize: job.paperSize,
            });

            const uniqueReadyName = `print_ready_${Date.now()}_${idx + 1}.pdf`;
            const targetDir = path.join(process.cwd(), 'public', 'uploads', shop.slug);
            await fs.mkdir(targetDir, { recursive: true });
            const targetPath = path.join(targetDir, uniqueReadyName);

            await fs.writeFile(targetPath, transformedBuffer);

            storageUrl = `/uploads/${shop.slug}/${uniqueReadyName}`;
            mimeType = 'application/pdf';
            fileSize = transformedBuffer.length;

            const loadedTransformed = await PDFDocument.load(transformedBuffer, { ignoreEncryption: true });
            pageCount = loadedTransformed.getPageCount();
          }
        }
      } catch (procErr) {
        console.warn('PDF imposition processing error:', procErr);
      }
    }

    processedDocs.push({
      shopId: shop.id,
      fileKey: `doc_${jobId}_${idx + 1}`,
      originalFilename: job.documentName,
      mimeType,
      pageCount,
      fileSize,
      storageUrl,
    });
  }

  // 5. Atomic Database Transaction
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
        create: processedDocs,
      },
    },
    include: {
      documents: true,
      payment: true,
    },
  });

  // If order has multiple documents, compile a master unified PDF for single-spool printing
  let masterPrintReadyUrl: string | undefined = undefined;
  if (order.documents.length > 1) {
    try {
      const allBuffers: Buffer[] = [];
      for (const d of order.documents) {
        const p = path.join(process.cwd(), 'public', d.storageUrl.replace(/^\//, ''));
        const b = await fs.readFile(p);
        allBuffers.push(b);
      }
      const masterBuffer = await generatePrintReadyPdf(allBuffers, {
        isSequentialMerge: true,
        nUp: 1,
        isGrayscale: input.jobs.every((j) => j.colorMode === 'BW'),
      });

      const masterName = `print_ready_order_${jobId}.pdf`;
      const targetDir = path.join(process.cwd(), 'public', 'uploads', shop.slug);
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(path.join(targetDir, masterName), masterBuffer);
      masterPrintReadyUrl = `/uploads/${shop.slug}/${masterName}`;
    } catch (masterErr) {
      console.warn('Master consolidated order PDF generation error:', masterErr);
    }
  }

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
        printReadyUrl: masterPrintReadyUrl || doc.storageUrl,
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

