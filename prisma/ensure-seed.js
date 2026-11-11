const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function ensureSeed() {
  try {
    const [shopCount, userCount] = await Promise.all([
      prisma.shop.count(),
      prisma.user.count(),
    ]);

    if (shopCount === 0 && userCount === 0) {
      console.log('Empty database detected — running initial seed...');
      await prisma.$disconnect();
      require('./seed.js');
    } else {
      console.log(`Database already initialized (${shopCount} shops, ${userCount} users) — skipping seed.`);
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Database seed check failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

ensureSeed();

