import { NextRequest } from 'next/server';
import { orderEvents } from '@/lib/sse';
import { getSessionFromCookies } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Real-Time Shop-Scoped Server-Sent Events (SSE) stream.
 * Notifies the open shop dashboard immediately (<100ms) when any customer order
 * is paid, queued, or updated, without breaking or replacing polling fallback.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const session = getSessionFromCookies();
  const requestedShopId = searchParams.get('shopId');

  const shopId =
    session?.role === 'SHOP_OWNER' && session.shopId
      ? session.shopId
      : requestedShopId;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (event: string, data: unknown) => {
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(payload));
    } catch {
      // Client disconnected
    }
  };

  sendEvent('connected', { shopId: shopId || null, timestamp: Date.now() });

  const listener = (data: { shopId?: string; jobId?: string; status?: string }) => {
    if (!shopId || !data.shopId || data.shopId === shopId) {
      sendEvent('statusUpdate', data);
    }
  };

  orderEvents.on('statusUpdate', listener);

  const heartbeat = setInterval(() => {
    sendEvent('ping', { time: Date.now() });
  }, 20000);

  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeat);
    orderEvents.off('statusUpdate', listener);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
