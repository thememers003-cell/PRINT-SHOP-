import { NextResponse } from 'next/server';
import { updateAgentHeartbeatLogic } from '@/lib/agent-service';

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-shop-api-key') || '';
    const result = await updateAgentHeartbeatLogic(apiKey);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
