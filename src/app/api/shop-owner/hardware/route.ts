import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromCookies } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = getSessionFromCookies();
    const body = await request.json();
    let shopId = body.shopId;

    if (session?.role === 'SHOP_OWNER' && session.shopId) {
      shopId = session.shopId;
    }

    if (!shopId) {
      const defaultShop = await prisma.shop.findFirst({
        where: { slug: 'sri-ganesh-xerox' },
      });
      shopId = defaultShop?.id || null;
    }

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required.' }, { status: 400 });
    }

    // Toggle Print Mode (AUTO vs MANUAL)
    if (body.printMode) {
      const updatedShop = await prisma.shop.update({
        where: { id: shopId },
        data: { printMode: body.printMode },
      });
      return NextResponse.json({ success: true, shop: updatedShop });
    }

    // Toggle printer status or add default printer
    if (body.printerId && body.status) {
      const updatedPrinter = await prisma.shopPrinter.update({
        where: { id: body.printerId },
        data: { status: body.status },
      });
      return NextResponse.json({ success: true, printer: updatedPrinter });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating hardware settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

