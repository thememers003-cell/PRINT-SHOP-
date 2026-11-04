import { NextResponse } from 'next/server';
import { getShopDashboardData } from '@/lib/shop-owner-service';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let shopId = searchParams.get('shopId');

    // If shopId not provided in query, default to first active shop (or session shop)
    if (!shopId) {
      const defaultShop = await prisma.shop.findFirst({
        where: { status: 'ACTIVE' },
      });
      if (!defaultShop) {
        return NextResponse.json({ error: 'No active shops found.' }, { status: 404 });
      }
      shopId = defaultShop.id;
    }

    const data = await getShopDashboardData(shopId);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

