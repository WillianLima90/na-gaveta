import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Buscar o campeonato do Brasileirão
  const champ = await prisma.championship.findFirst({ where: { slug: 'brasileirao-serie-a-2026' } });
  if (!champ) { console.log('Campeonato não encontrado'); return; }
  console.log('Campeonato:', champ.name, champ.id);

  // Buscar rodadas existentes do Brasileirão
  const rounds = await prisma.round.findMany({
    where: { championshipId: champ.id },
    orderBy: { number: 'asc' }
  });
  console.log('Rodadas existentes:', rounds.map(r => r.name));

  // Encerrar jogos da Rodada 3 com resultados
  const round3 = rounds.find(r => r.number === 3);
  if (round3) {
    const matches3 = await prisma.match.findMany({ where: { roundId: round3.id } });
    for (const m of matches3) {
      if (m.status !== 'FINISHED') {
        await prisma.match.update({
          where: { id: m.id },
          data: { status: 'FINISHED', homeScore: Math.floor(Math.random() * 4), awayScore: Math.floor(Math.random() * 3) }
        });
        console.log('Rodada 3 jogo encerrado:', m.homeTeam, 'vs', m.awayTeam);
      }
    }
  }

  // Criar Rodada 4 se não existir
  let round4 = rounds.find(r => r.number === 4);
  if (!round4) {
    round4 = await prisma.round.create({
      data: {
        championshipId: champ.id,
        number: 4,
        name: 'Rodada 4',
        isBonusRound: false,
        startDate: new Date('2026-04-20T00:00:00Z'),
        endDate: new Date('2026-04-22T23:59:59Z'),
      }
    });
    console.log('Rodada 4 criada:', round4.id);

    // Criar jogos para a Rodada 4
    await prisma.match.createMany({
      data: [
        { roundId: round4.id, homeTeam: 'Botafogo', awayTeam: 'Fluminense', matchDate: new Date('2026-04-20T16:00:00Z'), status: 'SCHEDULED' },
        { roundId: round4.id, homeTeam: 'Cruzeiro', awayTeam: 'Atlético-MG', matchDate: new Date('2026-04-20T19:00:00Z'), status: 'SCHEDULED' },
        { roundId: round4.id, homeTeam: 'São Paulo', awayTeam: 'Corinthians', matchDate: new Date('2026-04-21T19:00:00Z'), status: 'SCHEDULED' },
      ]
    });
    console.log('Jogos da Rodada 4 criados');
  }

  console.log('Dados de teste criados com sucesso!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
