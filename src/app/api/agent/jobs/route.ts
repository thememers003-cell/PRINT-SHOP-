import { NextResponse } from 'next/server';
import { claimPendingJobLogic, reportJobStatusLogic } from '@/lib/agent-service';

export async function GET(request: Request) {
  try {
    const apiKey = request.headers.get('x-shop-api-key') || '';
    const result = await claimPendingJobLogic(apiKey);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-shop-api-key') || '';
    const body = await request.json();
    const result = await reportJobStatusLogic(apiKey, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
