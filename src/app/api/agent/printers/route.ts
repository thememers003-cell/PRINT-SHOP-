import { NextResponse } from 'next/server';
import { registerPrintersLogic } from '@/lib/agent-service';

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-shop-api-key') || '';
    const body = await request.json();
    const result = await registerPrintersLogic(apiKey, body.printers || []);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
