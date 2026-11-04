import { NextRequest } from 'next/server';
import { orderEvents } from '@/lib/sse';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connected event
  const sendEvent = async (event: string, data: any) => {
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(payload));
    } catch (e) {
      // Stream closed
    }
  };

  // Immediate fetch of current status
  prisma.order.findUnique({
    where: { jobId },
    select: { status: true, paymentStatus: true, updatedAt: true },
  }).then((order) => {
    if (order) {
      sendEvent('statusUpdate', {
        jobId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        timestamp: order.updatedAt.toISOString(),
      });
    }
  });

  // Listener for dynamic updates
  const listener = (data: any) => {
    if (data.jobId === jobId) {
      sendEvent('statusUpdate', data);
    }
  };

  orderEvents.on('statusUpdate', listener);

  // Keep-alive heartbeat every 15 seconds
  const interval = setInterval(() => {
    sendEvent('ping', { time: Date.now() });
  }, 15000);

  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
    orderEvents.off('statusUpdate', listener);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

