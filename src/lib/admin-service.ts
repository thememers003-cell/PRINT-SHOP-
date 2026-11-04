import { prisma } from './prisma';

export interface CreateShopInput {
  name: string;
  slug: string;
  ownerName: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  gstNumber?: string;
  commissionRate?: number;
  commissionType?: 'PERCENT' | 'FLAT';
  printMode?: 'MANUAL' | 'AUTO';
  password?: string;
}

export async function createShopLogic(input: CreateShopInput) {
  // Check slug uniqueness
  const existing = await prisma.shop.findUnique({
    where: { slug: input.slug },
  });
  if (existing) {
    throw new Error(`Shop slug '${input.slug}' is already taken.`);
  }

  const shop = await prisma.shop.create({
    data: {
      name: input.name,
      slug: input.slug,
      ownerName: input.ownerName,
      email: input.email,
      mobile: input.mobile,
      address: input.address,
      city: input.city,
      state: input.state,
      pinCode: input.pinCode,
      gstNumber: input.gstNumber,
      commissionRate: input.commissionRate ?? 5.0,
      commissionType: input.commissionType ?? 'PERCENT',
      printMode: input.printMode ?? 'MANUAL',
      status: 'ACTIVE',
      users: {
        create: {
          email: input.email,
          password: input.password ?? 'shop123',
          name: input.ownerName,
          role: 'SHOP_OWNER',
        },
      },
      pricing: {
        create: {
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
      },
      printers: {
        create: {
          name: 'Default Windows Spooler',
          systemDriver: 'Generic / Text Only',
          portName: 'USB001',
          status: 'ONLINE',
          isDefault: true,
          supportsColor: true,
          supportsDuplex: true,
          paperSizes: 'A4,Letter',
        },
      },
    },
    include: {
      pricing: true,
      users: true,
    },
  });

  return { shop };
}

export async function getPlatformMetrics() {
  const [
    totalShops,
    activeShops,
    inactiveShops,
    totalOrders,
    orders,
    settlements,
  ] = await Promise.all([
    prisma.shop.count(),
    prisma.shop.count({ where: { status: 'ACTIVE' } }),
    prisma.shop.count({ where: { status: { in: ['INACTIVE', 'SUSPENDED'] } } }),
    prisma.order.count(),
    prisma.order.findMany({
      select: {
        status: true,
        totalAmount: true,
        platformCommission: true,
        shopEarnings: true,
        paymentStatus: true,
      },
    }),
    prisma.settlement.findMany({
      select: {
        status: true,
        shopPayout: true,
      },
    }),
  ]);

  let totalCustomerPayments = 0;
  let totalPlatformRevenue = 0;
  let totalShopEarnings = 0;
  let pendingOrders = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;

  for (const order of orders) {
    if (order.paymentStatus === 'SUCCESS') {
      totalCustomerPayments += order.totalAmount;
      totalPlatformRevenue += order.platformCommission;
      totalShopEarnings += order.shopEarnings;
    }
    if (['UPLOADED', 'CONFIGURED', 'PAYMENT_PENDING', 'PAID', 'QUEUED', 'PRINTING'].includes(order.status)) {
      pendingOrders++;
    } else if (order.status === 'COMPLETED') {
      completedOrders++;
    } else if (['CANCELLED', 'FAILED'].includes(order.status)) {
      cancelledOrders++;
    }
  }

  let pendingSettlements = 0;
  for (const s of settlements) {
    if (s.status === 'PENDING') {
      pendingSettlements += s.shopPayout;
    }
  }

  return {
    totalShops,
    activeShops,
    inactiveShops,
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalCustomerPayments: Number(totalCustomerPayments.toFixed(2)),
    totalPlatformRevenue: Number(totalPlatformRevenue.toFixed(2)),
    totalShopEarnings: Number(totalShopEarnings.toFixed(2)),
    pendingSettlements: Number(pendingSettlements.toFixed(2)),
  };
}

