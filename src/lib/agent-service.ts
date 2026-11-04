import { prisma } from './prisma';
import { orderEvents } from './sse';

export async function verifyAgentApiKey(apiKey: string) {
  if (!apiKey) {
    throw new Error('Unauthorized: API key missing.');
  }

  const shop = await prisma.shop.findUnique({
    where: { apiKey },
    include: {
      printers: true,
    },
  });

  if (!shop) {
    throw new Error('Unauthorized: Invalid shop API key.');
  }

  return shop;
}

export async function registerPrintersLogic(
  apiKey: string,
  printers: Array<{
    name: string;
    systemDriver?: string;
    portName?: string;
    supportsColor?: boolean;
    supportsDuplex?: boolean;
    paperSizes?: string;
  }>
) {
  const shop = await verifyAgentApiKey(apiKey);

  let registeredCount = 0;
  for (const p of printers) {
    // Check if printer already registered by name for this shop
    const existing = await prisma.shopPrinter.findFirst({
      where: { shopId: shop.id, name: p.name },
    });

    if (existing) {
      await prisma.shopPrinter.update({
        where: { id: existing.id },
        data: {
          status: 'ONLINE',
          lastHeartbeat: new Date(),
          supportsColor: p.supportsColor ?? existing.supportsColor,
          supportsDuplex: p.supportsDuplex ?? existing.supportsDuplex,
          paperSizes: p.paperSizes ?? existing.paperSizes,
        },
      });
    } else {
      await prisma.shopPrinter.create({
        data: {
          shopId: shop.id,
          name: p.name,
          systemDriver: p.systemDriver || 'Generic Windows Driver',
          portName: p.portName || 'LPT1',
          status: 'ONLINE',
          isDefault: registeredCount === 0 && shop.printers.length === 0,
          supportsColor: p.supportsColor ?? false,
          supportsDuplex: p.supportsDuplex ?? true,
          paperSizes: p.paperSizes || 'A4,Letter',
        },
      });
    }
    registeredCount++;
  }

  return { success: true, registeredCount };
}

export async function claimPendingJobLogic(apiKey: string) {
  const shop = await verifyAgentApiKey(apiKey);

  // Find oldest QUEUED order for this shop
  const order = await prisma.order.findFirst({
    where: {
      shopId: shop.id,
      status: 'QUEUED',
    },
    include: {
      documents: true,
      jobs: {
        include: { printer: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!order) {
    return { job: null };
  }

  // Idempotently transition order and jobs to PRINTING
  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'PRINTING',
      jobs: {
        updateMany: {
          where: { orderId: order.id },
          data: { printStatus: 'PRINTING' },
        },
      },
    },
    include: {
      documents: true,
      jobs: {
        include: { printer: true },
      },
    },
  });

  // Emit SSE live update
  orderEvents.emit('statusUpdate', {
    jobId: order.jobId,
    status: 'PRINTING',
    paymentStatus: order.paymentStatus,
    timestamp: new Date().toISOString(),
  });

  return {
    job: {
      orderId: updatedOrder.id,
      jobId: updatedOrder.jobId,
      status: updatedOrder.status,
      customerName: updatedOrder.customerName,
      documents: updatedOrder.documents.map((d) => ({
        id: d.id,
        filename: d.originalFilename,
        storageUrl: d.storageUrl,
      })),
      jobs: updatedOrder.jobs.map((j) => ({
        id: j.id,
        copies: j.copies,
        colorMode: j.colorMode,
        sides: j.sides,
        orientation: j.orientation,
        paperSize: j.paperSize,
        pageRange: j.pageRange,
        nUp: j.nUp,
        targetPrinterName: j.printer?.name || shop.printers.find((p) => p.isDefault)?.name || 'Default',
      })),
    },
  };
}

export async function reportJobStatusLogic(
  apiKey: string,
  payload: {
    orderId: string;
    status: 'COMPLETED' | 'FAILED';
    errorMessage?: string;
  }
) {
  const shop = await verifyAgentApiKey(apiKey);

  const order = await prisma.order.findFirst({
    where: { id: payload.orderId, shopId: shop.id },
  });

  if (!order) {
    throw new Error('Order not found or unauthorized.');
  }

  const updated = await prisma.order.update({
    where: { id: payload.orderId },
    data: {
      status: payload.status,
      jobs: {
        updateMany: {
          where: { orderId: payload.orderId },
          data: {
            printStatus: payload.status,
            errorMessage: payload.errorMessage,
          },
        },
      },
    },
  });

  // Emit SSE live event
  orderEvents.emit('statusUpdate', {
    jobId: order.jobId,
    status: payload.status,
    paymentStatus: order.paymentStatus,
    timestamp: new Date().toISOString(),
  });

  return { success: true, status: updated.status };
}

export async function updateAgentHeartbeatLogic(apiKey: string) {
  const shop = await verifyAgentApiKey(apiKey);

  await prisma.shopPrinter.updateMany({
    where: { shopId: shop.id },
    data: {
      status: 'ONLINE',
      lastHeartbeat: new Date(),
    },
  });

  return { success: true, timestamp: new Date().toISOString() };
}

