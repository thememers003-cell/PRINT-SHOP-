import { prisma } from './prisma';

export async function getShopBySlugLogic(slug: string) {
  const shop = await prisma.shop.findUnique({
    where: { slug },
    include: {
      pricing: true,
      printers: {
        where: { status: 'ONLINE' },
        select: {
          id: true,
          name: true,
          supportsColor: true,
          supportsDuplex: true,
          paperSizes: true,
        },
      },
    },
  });

  if (!shop) {
    throw new Error('Shop not found');
  }

  return { shop };
}

