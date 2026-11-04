import { NextResponse } from 'next/server';
import { createOrderCheckoutLogic } from '@/lib/order-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createOrderCheckoutLogic(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

