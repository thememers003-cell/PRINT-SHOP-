import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const cleanOwnerEmail = body.ownerEmail ? String(body.ownerEmail).trim().toLowerCase() : undefined;
    const cleanPassword = body.password ? String(body.password).trim() : undefined;
    const cleanOwnerName = body.ownerName ? String(body.ownerName).trim() : undefined;

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
        ...(cleanOwnerEmail ? { email: cleanOwnerEmail } : {}),
        ...(cleanOwnerName ? { ownerName: cleanOwnerName } : {}),
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

    // Update or create shop owner login credentials
    if (cleanPassword || cleanOwnerEmail || cleanOwnerName) {
      const existingUser = (await prisma.user.findFirst({
        where: { shopId: id },
      })) || (cleanOwnerEmail ? await prisma.user.findFirst({ where: { email: cleanOwnerEmail } }) : null);

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            shopId: id,
            role: 'SHOP_OWNER',
            ...(cleanPassword ? { password: cleanPassword } : {}),
            ...(cleanOwnerEmail ? { email: cleanOwnerEmail } : {}),
            ...(cleanOwnerName ? { name: cleanOwnerName } : {}),
          },
        });
      } else {
        const finalEmail = cleanOwnerEmail || String(updated.email).trim().toLowerCase();
        const finalPassword = cleanPassword || 'PASS@123';
        const finalName = cleanOwnerName || updated.ownerName || updated.name;

        await prisma.user.create({
          data: {
            shopId: id,
            email: finalEmail,
            password: finalPassword,
            name: finalName,
            role: 'SHOP_OWNER',
          },
        });
      }
    }

    return NextResponse.json({ shop: updated, success: true });
  } catch (error: any) {
    console.error('Error updating shop:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await prisma.$transaction([
      prisma.printJob.deleteMany({ where: { order: { shopId: id } } }),
      prisma.payment.deleteMany({ where: { order: { shopId: id } } }),
      prisma.order.deleteMany({ where: { shopId: id } }),
      prisma.document.deleteMany({ where: { shopId: id } }),
      prisma.shopPrinter.deleteMany({ where: { shopId: id } }),
      prisma.shopPricing.deleteMany({ where: { shopId: id } }),
      prisma.settlement.deleteMany({ where: { shopId: id } }),
      prisma.user.deleteMany({ where: { shopId: id } }),
      prisma.shop.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
