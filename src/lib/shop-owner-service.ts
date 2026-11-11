import { prisma } from './prisma';
import { orderEvents } from './sse';

export async function getShopDashboardData(shopId: string) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      pricing: true,
      printers: true,
    },
  });

  if (!shop) {
    throw new Error('Shop not found');
  }

  const orders = await prisma.order.findMany({
    where: { shopId },
    include: {
      documents: true,
      jobs: {
        include: {
          printer: true,
        },
      },
      payment: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate POS metrics
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let todayOrdersCount = 0;
  let todayEarnings = 0;
  let monthlyEarnings = 0;
  let pendingPayments = 0;
  let paidOrders = 0;
  let printingInProgress = 0;
  let completedOrders = 0;
  let failedOrders = 0;
  let totalPagesPrinted = 0;

  for (const order of orders) {
    const isToday = new Date(order.createdAt) >= startOfToday;
    if (isToday) {
      todayOrdersCount++;
    }

    if (order.paymentStatus === 'SUCCESS') {
      if (isToday) todayEarnings += order.shopEarnings;
      monthlyEarnings += order.shopEarnings;
      paidOrders++;
    } else {
      pendingPayments++;
    }

    if (order.status === 'PRINTING') printingInProgress++;
    if (order.status === 'COMPLETED') completedOrders++;
    if (['FAILED', 'CANCELLED'].includes(order.status)) failedOrders++;

    for (const job of order.jobs) {
      if (order.status === 'COMPLETED') {
        const doc = order.documents.find((d) => d.id === job.documentId);
        if (doc) totalPagesPrinted += doc.pageCount * job.copies;
      }
    }
  }

  return {
    shop,
    orders,
    metrics: {
      todayOrdersCount,
      todayEarnings: Number(todayEarnings.toFixed(2)),
      monthlyEarnings: Number(monthlyEarnings.toFixed(2)),
      pendingPayments,
      paidOrders,
      printingInProgress,
      completedOrders,
      failedOrders,
      totalPagesPrinted,
    },
  };
}

export async function dispatchManualPrintLogic(orderId: string, shopId: string, printerId?: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, shopId },
    include: { jobs: true },
  });

  if (!order) {
    throw new Error('Order not found or unauthorized for this shop.');
  }

  // Update order status to QUEUED so Windows Agent can pull and print it
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'QUEUED',
      jobs: {
        updateMany: {
          where: { orderId },
          data: {
            printStatus: 'QUEUED',
            ...(printerId ? { printerId } : {}),
          },
        },
      },
    },
    include: {
      jobs: true,
      shop: true,
    },
  });

  // Emit SSE event
  orderEvents.emit('statusUpdate', {
    jobId: order.jobId,
    status: 'QUEUED',
    paymentStatus: order.paymentStatus,
    timestamp: new Date().toISOString(),
  });

  // On local Windows host, trigger silent hardware spooling immediately.
  // On Linux cloud servers (e.g. Render), leave status QUEUED for the remote Windows Print Agent to claim.
  if (process.platform === 'win32') {
    import('./spooler-service').then(({ spoolOrderDirectly }) => {
      spoolOrderDirectly(orderId).catch((err) => {
        console.warn('Silent hardware spooling notice:', err.message);
      });
    });
  }

  return { order: updated };
}

export async function updateOrderStatusLogic(orderId: string, shopId: string, status: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, shopId },
  });

  if (!order) {
    throw new Error('Order not found.');
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      jobs: {
        updateMany: {
          where: { orderId },
          data: {
            printStatus: status === 'COMPLETED' ? 'COMPLETED' : status === 'FAILED' ? 'FAILED' : 'QUEUED',
          },
        },
      },
    },
  });

  orderEvents.emit('statusUpdate', {
    jobId: order.jobId,
    status,
    paymentStatus: order.paymentStatus,
    timestamp: new Date().toISOString(),
  });

  return { order: updated };
}

