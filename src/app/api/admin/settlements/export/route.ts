import { NextResponse } from 'next/server';
import { getSettlementLedgerData, generateSettlementCsv } from '@/lib/settlement';

export async function GET() {
  try {
    const { shopLedgers } = await getSettlementLedgerData();

    const records = shopLedgers.map((l) => ({
      shopName: l.shopName,
      totalOrders: l.totalOrders,
      totalGross: l.totalGross,
      platformCommission: l.platformCommission,
      shopPayout: l.shopEarnings,
      status: l.pendingBalance > 0 ? 'PENDING' : 'SETTLED',
      settledDate: new Date().toISOString().split('T')[0],
    }));

    const csvData = generateSettlementCsv(records);

    return new Response(csvData, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="PrintBro_Settlement_Report_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
