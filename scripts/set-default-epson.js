const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dummyNames = [
    'Canon LBP 2900 (High Speed Laser)',
    'HP InkTank 415 (Color & Photo)',
    'HP LaserJet Pro MFP M428fdw',
    'OneNote for Windows 10',
    'OrCADPS_17.2',
    'OneNote (Desktop)',
    'Microsoft XPS Document Writer',
    'Microsoft Print to PDF',
    'Fax',
    'Generic / Text Only',
    'Generic / Text Only (Copy 1)',
  ];

  await prisma.shopPrinter.deleteMany({
    where: {
      shop: { slug: 'sri-ganesh-xerox' },
      name: { in: dummyNames },
    },
  });

  await prisma.shopPrinter.updateMany({
    where: {
      shop: { slug: 'sri-ganesh-xerox' },
      name: { contains: 'EPSON' },
    },
    data: { isDefault: true, status: 'ONLINE', supportsColor: true, supportsDuplex: true },
  });

  const remaining = await prisma.shopPrinter.findMany({
    where: { shop: { slug: 'sri-ganesh-xerox' } },
  });

  console.log('Real physical printers configured for shop:', remaining.map((p) => `${p.name} (isDefault: ${p.isDefault})`));
  await prisma.$disconnect();
}

main().catch(console.error);
