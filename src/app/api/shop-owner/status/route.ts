import { NextResponse } from 'next/server';
import { updateOrderStatusLogic } from '@/lib/shop-owner-service';
import { getSessionFromCookies } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const { orderId, shopId, status } = await request.json();
    if (!orderId || !shopId || !status) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const session = getSessionFromCookies();
    if (session && session.role === 'SHOP_OWNER' && session.shopId && session.shopId !== shopId) {
      return NextResponse.json({ error: 'Unauthorized access to another shop orders.' }, { status: 403 });
    }

    const result = await updateOrderStatusLogic(orderId, shopId, status);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

