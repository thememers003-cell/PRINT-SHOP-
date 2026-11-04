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
