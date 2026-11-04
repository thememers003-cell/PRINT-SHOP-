import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Print Bro database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.printJob.deleteMany();
  await prisma.document.deleteMany();
  await prisma.order.deleteMany();
  await prisma.shopPrinter.deleteMany();
  await prisma.shopPricing.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shop.deleteMany();

  // 1. Super Admin User
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@printbro.online',
      password: 'admin123', // In production, bcrypt hash
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Created Super Admin:', superAdmin.email);

  // 2. Shop 1: Sri Ganesh Xerox (Automatic Mode)
  const shop1 = await prisma.shop.create({
    data: {
      slug: 'sri-ganesh-xerox',
      name: 'Sri Ganesh Xerox & Stationers',
      ownerName: 'Ramesh Kumar',
      email: 'owner@ganeshxerox.com',
      mobile: '9845012345',
      address: 'Shop #12, College Circle, Near Gate 2',
      city: 'Bangalore',
      state: 'Karnataka',
      pinCode: '560001',
      gstNumber: '29ABCDE1234F1Z5',
      status: 'ACTIVE',
      printMode: 'AUTO',
      commissionRate: 5.0,
      commissionType: 'PERCENT',
      apiKey: 'pb_live_ganesh_xerox_secret_key_2026',
      users: {
        create: {
          email: 'owner@ganeshxerox.com',
          password: 'shop123',
          name: 'Ramesh Kumar',
          role: 'SHOP_OWNER',
        },
      },
      pricing: {
        create: {
          bwSingle: 2.0,
          bwDuplex: 1.5, // ₹3 per duplex sheet
          colorSingle: 10.0,
          colorDuplex: 9.0, // ₹18 per duplex sheet
          a3Multiplier: 2.0,
          a5Multiplier: 0.8,
          letterMultiplier: 1.0,
          legalMultiplier: 1.2,
          minOrderAmount: 5.0,
          serviceFee: 2.0,
        },
      },
      printers: {
        create: [
          {
            name: 'Canon LBP 2900 (High Speed Laser)',
            systemDriver: 'Canon LBP2900',
            portName: 'USB001',
            status: 'ONLINE',
            isDefault: true,
            supportsColor: false,
            supportsDuplex: true,
            paperSizes: 'A4,Letter,Legal',
            activeQueueLength: 0,
          },
          {
            name: 'HP InkTank 415 (Color & Photo)',
            systemDriver: 'HP Ink Tank 410 series',
            portName: 'USB002',
            status: 'ONLINE',
            isDefault: false,
            supportsColor: true,
            supportsDuplex: false,
            paperSizes: 'A4,A3,Letter',
            activeQueueLength: 0,
          },
        ],
      },
    },
  });
  console.log('Created Shop 1:', shop1.name, `(${shop1.slug})`);

  // 3. Shop 2: Quick Print Hub (Manual Mode)
  const shop2 = await prisma.shop.create({
    data: {
      slug: 'quick-print-hub',
      name: 'Quick Print Hub & Digital Press',
      ownerName: 'Priya Sharma',
      email: 'priya@quickprinthub.com',
      mobile: '9811223344',
      address: '42 Main Bazaar, Metro Station Pillar 120',
      city: 'Delhi',
      state: 'Delhi',
      pinCode: '110001',
      status: 'ACTIVE',
      printMode: 'MANUAL',
      commissionRate: 5.0,
      commissionType: 'PERCENT',
      apiKey: 'pb_live_quick_print_secret_key_2026',
      users: {
        create: {
          email: 'priya@quickprinthub.com',
          password: 'shop123',
          name: 'Priya Sharma',
          role: 'SHOP_OWNER',
        },
      },
      pricing: {
        create: {
          bwSingle: 1.5,
          bwDuplex: 1.25,
          colorSingle: 8.0,
          colorDuplex: 7.5,
          a3Multiplier: 2.0,
          a5Multiplier: 0.8,
          letterMultiplier: 1.0,
          legalMultiplier: 1.2,
          minOrderAmount: 5.0,
          serviceFee: 0.0,
        },
      },
      printers: {
        create: [
          {
            name: 'Xerox WorkCentre 5024',
            systemDriver: 'Xerox WorkCentre 5024 PCL6',
            portName: '192.168.1.150:9100',
            status: 'ONLINE',
            isDefault: true,
            supportsColor: true,
            supportsDuplex: true,
            paperSizes: 'A4,A3,Legal,Letter',
            activeQueueLength: 0,
          },
        ],
      },
    },
  });
  console.log('Created Shop 2:', shop2.name, `(${shop2.slug})`);

  // 4. Sample Seed Order for Sri Ganesh Xerox
  const seedOrder = await prisma.order.create({
    data: {
      jobId: 'PB-2026-000001',
      shopId: shop1.id,
      customerName: 'Aarav Patel',
      customerPhone: '9876543210',
      status: 'PAID',
      totalAmount: 18.0,
      platformCommission: 0.9,
      shopEarnings: 17.1,
      paymentStatus: 'SUCCESS',
      trackingToken: 'track_seed_token_001',
      notes: 'Please staple on top left',
      payment: {
        create: {
          gateway: 'PHONEPE',
          amount: 18.0,
          status: 'SUCCESS',
          transactionId: 'TXN_PHONEPE_20260401',
        },
      },
      documents: {
        create: {
          shopId: shop1.id,
          fileKey: 'sample-project-report.pdf',
          originalFilename: 'Project_Report_Final.pdf',
          mimeType: 'application/pdf',
          pageCount: 8,
          fileSize: 1048576,
          storageUrl: '/uploads/sri-ganesh-xerox/sample-project-report.pdf',
        },
      },
    },
    include: {
      documents: true,
    },
  });

  // Create associated PrintJob
  await prisma.printJob.create({
    data: {
      orderId: seedOrder.id,
      documentId: seedOrder.documents[0].id,
      copies: 1,
      colorMode: 'BW',
      sides: 'DUPLEX',
      orientation: 'PORTRAIT',
      paperSize: 'A4',
      pageRange: '1-8',
      nUp: 1,
      printStatus: 'QUEUED',
    },
  });

  console.log('Seeded initial test order:', seedOrder.jobId);
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

