import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createShopLogic, getPlatformMetrics } from '@/lib/admin-service';

export async function GET() {
  try {
    const [metrics, shops] = await Promise.all([
      getPlatformMetrics(),
      prisma.shop.findMany({
        include: {
          pricing: true,
          printers: true,
          users: {
            select: {
              id: true,
              email: true,
              password: true,
              name: true,
              role: true,
            },
          },
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({ metrics, shops });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createShopLogic(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required.' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.printJob.deleteMany({ where: { order: { shopId } } }),
      prisma.payment.deleteMany({ where: { order: { shopId } } }),
      prisma.order.deleteMany({ where: { shopId } }),
      prisma.document.deleteMany({ where: { shopId } }),
      prisma.shopPrinter.deleteMany({ where: { shopId } }),
      prisma.shopPricing.deleteMany({ where: { shopId } }),
      prisma.settlement.deleteMany({ where: { shopId } }),
      prisma.user.deleteMany({ where: { shopId } }),
      prisma.shop.delete({ where: { id: shopId } }),
    ]);

    return NextResponse.json({ success: true, deletedShopId: shopId });
  } catch (error: any) {
    console.error('Delete shop error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


