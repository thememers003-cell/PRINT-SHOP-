import { prisma } from './prisma';

export async function getOrderTrackingLogic(jobId: string) {
  const order = await prisma.order.findUnique({
    where: { jobId },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
          mobile: true,
          address: true,
          city: true,
          printMode: true,
        },
      },
      documents: true,
      jobs: {
        include: {
          printer: {
            select: { name: true },
          },
        },
      },
      payment: true,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  return {
    id: order.id,
    jobId: order.jobId,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    shopName: order.shop.name,
    shopSlug: order.shop.slug,
    shopPhone: order.shop.mobile,
    shopAddress: `${order.shop.address}, ${order.shop.city}`,
    totalAmount: order.totalAmount,
    paymentStatus: order.paymentStatus,
    paymentGateway: order.payment?.gateway || 'UPI',
    transactionId: order.payment?.transactionId,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    documents: order.documents.map((d) => ({
      id: d.id,
      name: d.originalFilename,
      pages: d.pageCount,
      size: d.fileSize,
    })),
    jobs: order.jobs.map((j) => ({
      id: j.id,
      copies: j.copies,
      colorMode: j.colorMode,
      sides: j.sides,
      paperSize: j.paperSize,
      nUp: j.nUp,
      status: j.printStatus,
      printerName: j.printer?.name,
    })),
  };
}

