import { prisma } from './prisma';

export interface ComputeSettlementParams {
  totalGross: number;
  commissionRate: number;
  commissionType?: 'PERCENT' | 'FLAT';
}

export function computeShopSettlement(params: ComputeSettlementParams) {
  let platformCommission = 0;

  if (params.commissionType === 'FLAT') {
    platformCommission = Math.min(params.totalGross, params.commissionRate);
  } else {
    // PERCENT
    platformCommission = Number(((params.totalGross * params.commissionRate) / 100).toFixed(2));
  }

  const shopEarnings = Number(Math.max(0, params.totalGross - platformCommission).toFixed(2));

  return {
    totalGross: params.totalGross,
    platformCommission,
    shopEarnings,
  };
}

export interface SettlementExportRecord {
  shopName: string;
  totalOrders: number;
  totalGross: number;
  platformCommission: number;
  shopPayout: number;
  status: string;
  settledDate?: string;
}

export function generateSettlementCsv(records: SettlementExportRecord[]): string {
  const headers = [
    'Shop Name',
    'Total Orders',
    'Gross GMV (INR)',
    'Platform Commission (INR)',
    'Net Shop Payout (INR)',
    'Status',
    'Settlement Date',
  ];

  const rows = records.map((r) => [
    `"${r.shopName.replace(/"/g, '""')}"`,
    r.totalOrders,
    r.totalGross.toFixed(2),
    r.platformCommission.toFixed(2),
    r.shopPayout.toFixed(2),
    r.status,
    r.settledDate || 'Pending',
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export async function getSettlementLedgerData() {
  const shops = await prisma.shop.findMany({
    include: {
      orders: {
        where: { paymentStatus: 'SUCCESS' },
      },
      settlements: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const shopLedgers = shops.map((shop) => {
    let totalGross = 0;
    let totalOrders = shop.orders.length;
    let platformCommission = 0;
    let shopPayout = 0;

    for (const order of shop.orders) {
      totalGross += order.totalAmount;
      platformCommission += order.platformCommission;
      shopPayout += order.shopEarnings;
    }

    const settledAmount = shop.settlements
      .filter((s) => s.status === 'SETTLED')
      .reduce((sum, s) => sum + s.shopPayout, 0);

    const pendingBalance = Math.max(0, shopPayout - settledAmount);

    return {
      shopId: shop.id,
      shopName: shop.name,
      slug: shop.slug,
      ownerName: shop.ownerName,
      commissionRate: shop.commissionRate,
      commissionType: shop.commissionType,
      totalOrders,
      totalGross: Number(totalGross.toFixed(2)),
      platformCommission: Number(platformCommission.toFixed(2)),
      shopEarnings: Number(shopPayout.toFixed(2)),
      settledAmount: Number(settledAmount.toFixed(2)),
      pendingBalance: Number(pendingBalance.toFixed(2)),
      recentSettlements: shop.settlements,
    };
  });

  return { shopLedgers };
}
