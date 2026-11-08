import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromCookies } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const session = getSessionFromCookies();
    const { searchParams } = new URL(request.url);
    let shopId = searchParams.get('shopId');

    if (session?.role === 'SHOP_OWNER' && session.shopId) {
      shopId = session.shopId;
    }

    if (!shopId) {
      const defaultShop = await prisma.shop.findFirst({
        where: { slug: 'sri-ganesh-xerox' },
      });
      shopId = defaultShop?.id || null;
    }

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required.' }, { status: 400 });
    }

    let pricing = await prisma.shopPricing.findUnique({
      where: { shopId },
    });

    if (!pricing) {
      pricing = await prisma.shopPricing.create({
        data: {
          shopId,
          bwSingle: 2.0,
          bwDuplex: 1.5,
          colorSingle: 10.0,
          colorDuplex: 9.0,
          a3Multiplier: 2.0,
          a5Multiplier: 0.8,
          letterMultiplier: 1.0,
          legalMultiplier: 1.2,
          minOrderAmount: 5.0,
          serviceFee: 0.0,
        },
      });
    }

    return NextResponse.json({ pricing });
  } catch (error: any) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = getSessionFromCookies();
    const body = await request.json();
    let shopId = body.shopId;

    if (session?.role === 'SHOP_OWNER' && session.shopId) {
      shopId = session.shopId;
    }

    if (!shopId) {
      const defaultShop = await prisma.shop.findFirst({
        where: { slug: 'sri-ganesh-xerox' },
      });
      shopId = defaultShop?.id || null;
    }

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required.' }, { status: 400 });
    }

    const {
      bwSingle,
      bwDuplex,
      colorSingle,
      colorDuplex,
      a3Multiplier,
      a5Multiplier,
      letterMultiplier,
      legalMultiplier,
      minOrderAmount,
      serviceFee,
    } = body;

    const parsedData = {
      ...(bwSingle !== undefined ? { bwSingle: parseFloat(bwSingle) } : {}),
      ...(bwDuplex !== undefined ? { bwDuplex: parseFloat(bwDuplex) } : {}),
      ...(colorSingle !== undefined ? { colorSingle: parseFloat(colorSingle) } : {}),
      ...(colorDuplex !== undefined ? { colorDuplex: parseFloat(colorDuplex) } : {}),
      ...(a3Multiplier !== undefined ? { a3Multiplier: parseFloat(a3Multiplier) } : {}),
      ...(a5Multiplier !== undefined ? { a5Multiplier: parseFloat(a5Multiplier) } : {}),
      ...(letterMultiplier !== undefined ? { letterMultiplier: parseFloat(letterMultiplier) } : {}),
      ...(legalMultiplier !== undefined ? { legalMultiplier: parseFloat(legalMultiplier) } : {}),
      ...(minOrderAmount !== undefined ? { minOrderAmount: parseFloat(minOrderAmount) } : {}),
      ...(serviceFee !== undefined ? { serviceFee: parseFloat(serviceFee) } : {}),
    };

    const updatedPricing = await prisma.shopPricing.upsert({
      where: { shopId },
      update: parsedData,
      create: {
        shopId,
        bwSingle: parsedData.bwSingle ?? 2.0,
        bwDuplex: parsedData.bwDuplex ?? 1.5,
        colorSingle: parsedData.colorSingle ?? 10.0,
        colorDuplex: parsedData.colorDuplex ?? 9.0,
        a3Multiplier: parsedData.a3Multiplier ?? 2.0,
        a5Multiplier: parsedData.a5Multiplier ?? 0.8,
        letterMultiplier: parsedData.letterMultiplier ?? 1.0,
        legalMultiplier: parsedData.legalMultiplier ?? 1.2,
        minOrderAmount: parsedData.minOrderAmount ?? 5.0,
        serviceFee: parsedData.serviceFee ?? 0.0,
      },
    });

    return NextResponse.json({
      success: true,
      pricing: updatedPricing,
      message: 'Shop pricing updated live and instant!',
    });
  } catch (error: any) {
    console.error('Error updating pricing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

