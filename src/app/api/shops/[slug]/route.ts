import { NextResponse } from 'next/server';
import { getShopBySlugLogic } from '@/lib/customer-service';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const data = await getShopBySlugLogic(slug);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

