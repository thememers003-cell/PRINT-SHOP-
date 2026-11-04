import { NextResponse } from 'next/server';
import { updateOrderStatusLogic } from '@/lib/shop-owner-service';

export async function POST(request: Request) {
  try {
    const { orderId, shopId, status } = await request.json();
    if (!orderId || !shopId || !status) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }
    const result = await updateOrderStatusLogic(orderId, shopId, status);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

