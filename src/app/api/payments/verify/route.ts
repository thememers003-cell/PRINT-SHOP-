import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { orderEvents } from '@/lib/sse';
import { matchPrinterForJob } from '@/lib/printer-matcher';

export async function POST(request: Request) {
  try {
    const { jobId, transactionId, signature } = await request.json();

    const order = await prisma.order.findUnique({
      where: { jobId },
      include: {
        shop: {
          include: {
            printers: { where: { status: 'ONLINE' } },
          },
        },
        jobs: true,
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.paymentStatus === 'SUCCESS') {
      return NextResponse.json({ message: 'Order is already marked as paid.', order });
    }

    // Determine target order state based on shop mode
    const isAutoPrint = order.shop.printMode === 'AUTO';
    const nextStatus = isAutoPrint ? 'QUEUED' : 'PAID';

    // Update Payment and Order
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        paymentStatus: 'SUCCESS',
        payment: {
          update: {
            status: 'SUCCESS',
            transactionId: transactionId || `TXN_${Date.now()}`,
            signature: signature || 'sig_verified_mock',
          },
        },
        jobs: {
          updateMany: {
            where: { orderId: order.id },
            data: {
              printStatus: isAutoPrint ? 'QUEUED' : 'PENDING',
            },
          },
        },
      },
      include: {
        shop: true,
        jobs: true,
        payment: true,
      },
    });

    // If auto-mode, match printers
    if (isAutoPrint && order.jobs.length > 0) {
      for (const job of order.jobs) {
        const matched = matchPrinterForJob(
          { colorMode: job.colorMode as any, paperSize: job.paperSize as any },
          order.shop.printers as any
        );
        if (matched) {
          await prisma.printJob.update({
            where: { id: job.id },
            data: { printerId: matched.id },
          });
        }
      }
    }

    // Broadcast SSE live update to tracking page & shop owner POS
    orderEvents.emit('statusUpdate', {
      jobId: order.jobId,
      status: nextStatus,
      paymentStatus: 'SUCCESS',
      timestamp: new Date().toISOString(),
    });

    // In AUTO mode: immediately trigger 100% silent hardware spooling with zero human intervention!
    if (isAutoPrint) {
      import('@/lib/spooler-service').then(({ spoolOrderDirectly }) => {
        spoolOrderDirectly(order.id).catch((spoolErr) => {
          console.warn('Auto silent spool fallback notice:', spoolErr.message);
        });
      });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

