import { NextResponse } from 'next/server';
import { dispatchManualPrintLogic } from '@/lib/shop-owner-service';

export async function POST(request: Request) {
  try {
    const { orderId, shopId, printerId, manual } = await request.json();
    if (!orderId || !shopId) {
      return NextResponse.json({ error: 'orderId and shopId are required.' }, { status: 400 });
    }
    const result = await dispatchManualPrintLogic(orderId, shopId, printerId, manual === true);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

