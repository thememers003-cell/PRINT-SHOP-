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
  const cleanEmail = String(input.email || '').trim().toLowerCase();
  const cleanPassword = String(input.password || 'PASS@123').trim();
  const cleanSlug = String(input.slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const cleanName = String(input.name || '').trim();
  const cleanOwnerName = String(input.ownerName || cleanName).trim();

  // Check slug uniqueness
  const existing = await prisma.shop.findUnique({
    where: { slug: cleanSlug },
  });
  if (existing) {
    throw new Error(`Shop slug '${cleanSlug}' is already taken.`);
  }

  // 1. Create the shop entity
  const shop = await prisma.shop.create({
    data: {
      name: cleanName,
      slug: cleanSlug,
      ownerName: cleanOwnerName,
      email: cleanEmail,
      mobile: String(input.mobile || '').trim(),
      address: String(input.address || '').trim(),
      city: String(input.city || '').trim(),
      state: String(input.state || '').trim(),
      pinCode: String(input.pinCode || '').trim(),
      gstNumber: input.gstNumber ? String(input.gstNumber).trim() : null,
      commissionRate: input.commissionRate ?? 5.0,
      commissionType: input.commissionType ?? 'PERCENT',
      printMode: input.printMode ?? 'MANUAL',
      status: 'ACTIVE',
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
    },
  });

  // 2. Guarantee shopkeeper User account exists and has exact email + password
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: cleanEmail },
        { email: String(input.email || '').trim() },
      ],
    },
  });

  let user;
  if (existingUser) {
    user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        email: cleanEmail,
        password: cleanPassword,
        name: cleanOwnerName,
        role: 'SHOP_OWNER',
        shopId: shop.id,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: cleanPassword,
        name: cleanOwnerName,
        role: 'SHOP_OWNER',
        shopId: shop.id,
      },
    });
  }

  return { shop: { ...shop, users: [user] } };
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
      where: { paymentStatus: 'SUCCESS' },
      select: {
        totalAmount: true,
        platformCommission: true,
        shopEarnings: true,
        status: true,
      },
    }),
    prisma.settlement.findMany({
      select: {
        shopPayout: true,
        status: true,
      },
    }),
  ]);

  const totalCustomerPayments = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalPlatformRevenue = orders.reduce((sum, o) => sum + o.platformCommission, 0);
  const totalShopDisbursements = orders.reduce((sum, o) => sum + o.shopEarnings, 0);

  const pendingSettlements = settlements
    .filter((s) => s.status === 'PENDING')
    .reduce((sum, s) => sum + s.shopPayout, 0);

  const completedSettlements = settlements
    .filter((s) => s.status === 'COMPLETED' || s.status === 'SETTLED')
    .reduce((sum, s) => sum + s.shopPayout, 0);

  return {
    totalShops,
    activeShops,
    inactiveShops,
    totalOrders,
    totalCustomerPayments: Number(totalCustomerPayments.toFixed(2)),
    totalPlatformRevenue: Number(totalPlatformRevenue.toFixed(2)),
    totalShopDisbursements: Number(totalShopDisbursements.toFixed(2)),
    pendingSettlements: Number(pendingSettlements.toFixed(2)),
    completedSettlements: Number(completedSettlements.toFixed(2)),
  };
}
