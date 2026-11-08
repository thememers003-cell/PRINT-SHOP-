import { NextResponse } from 'next/server';
import { getShopDashboardData } from '@/lib/shop-owner-service';
import { prisma } from '@/lib/prisma';
import { getSessionFromCookies } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const session = getSessionFromCookies();
    const { searchParams } = new URL(request.url);
    let shopId = searchParams.get('shopId');

    // Strict Multi-Tenant Enforcement:
    // If authenticated as a SHOP_OWNER, strictly enforce their own shopId!
    if (session?.role === 'SHOP_OWNER' && session.shopId) {
      shopId = session.shopId;
    }

    // If shopId not provided in query and no shop owner session, default to Sri Ganesh Xerox
    if (!shopId) {
      const defaultShop =
        (await prisma.shop.findFirst({
          where: { slug: 'sri-ganesh-xerox' },
        })) ||
        (await prisma.shop.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' },
        }));
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

