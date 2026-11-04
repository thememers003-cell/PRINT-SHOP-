import { NextResponse } from 'next/server';
import { getSettlementLedgerData } from '@/lib/settlement';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const data = await getSettlementLedgerData();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { shopId, amount, transactionRef } = await request.json();
    if (!shopId || !amount) {
      return NextResponse.json({ error: 'shopId and amount are required.' }, { status: 400 });
    }

    const now = new Date();
    const settlement = await prisma.settlement.create({
      data: {
        shopId,
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        periodEnd: now,
        totalGross: amount,
        platformCommission: 0,
        shopPayout: amount,
        status: 'SETTLED',
        transactionRef: transactionRef || `UTR_${Date.now()}`,
        settledAt: now,
      },
    });

    return NextResponse.json({ settlement });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

