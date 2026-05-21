import { PrismaClient, MatchStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do Brasileirao real...');

  const championship = await prisma.championship.create({
    data: {
      name: 'Brasileirao Serie A 2026',
      slug: 'brasileirao-serie-a-2026-real',
      season: '2026',
      country: 'Brasil',
      isActive: true,
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
    },
  });

  console.log('Campeonato criado:', championship.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
