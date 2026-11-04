import { NextResponse } from 'next/server';
import { getOrderTrackingLogic } from '@/lib/tracking-service';

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const data = await getOrderTrackingLogic(jobId);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

