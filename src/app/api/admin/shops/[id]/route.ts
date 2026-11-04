import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const updated = await prisma.shop.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.printMode ? { printMode: body.printMode } : {}),
        ...(body.commissionRate !== undefined ? { commissionRate: body.commissionRate } : {}),
        ...(body.commissionType ? { commissionType: body.commissionType } : {}),
        ...(body.name ? { name: body.name } : {}),
        ...(body.mobile ? { mobile: body.mobile } : {}),
        ...(body.address ? { address: body.address } : {}),
      },
      include: { pricing: true },
    });

    // Update pricing if passed
    if (body.pricing) {
      await prisma.shopPricing.upsert({
        where: { shopId: id },
        update: body.pricing,
        create: {
          shopId: id,
          ...body.pricing,
        },
      });
    }

    return NextResponse.json({ shop: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await prisma.shop.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

