const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const championship = await prisma.championship.upsert({
    where: { slug: 'copa-do-mundo-fifa-2026' },
    update: {
      name: 'Copa do Mundo FIFA 2026',
      season: '2026',
      country: 'World',
      isActive: true,
      startDate: new Date('2026-06-11T00:00:00.000Z'),
      endDate: new Date('2026-07-19T23:59:59.000Z'),
    },
    create: {
      name: 'Copa do Mundo FIFA 2026',
      slug: 'copa-do-mundo-fifa-2026',
      season: '2026',
      country: 'World',
      isActive: true,
      startDate: new Date('2026-06-11T00:00:00.000Z'),
      endDate: new Date('2026-07-19T23:59:59.000Z'),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      season: true,
      isActive: true,
      _count: { select: { rounds: true, pools: true } },
    },
  });

  console.log(JSON.stringify(championship, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
