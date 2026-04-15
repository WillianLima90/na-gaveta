// Script JavaScript puro para:
// 1. Configurar times do coração dos usuários de teste
// 2. Calcular e persistir vencedores de rodada

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Buscar usuários
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, favoriteTeam: true },
  });
  console.log('Usuários encontrados:', users.length);

  // 2. Atribuir times do coração por email
  const emailToTeam = {
    'joao@nagaveta.com': 'Flamengo',
    'maria@nagaveta.com': 'Palmeiras',
    'pedro@nagaveta.com': 'Corinthians',
    'admin@nagaveta.com': 'Grêmio',
  };

  for (const user of users) {
    const teamName = emailToTeam[user.email || ''];
    if (teamName) {
      await prisma.user.update({
        where: { id: user.id },
        data: { favoriteTeam: teamName },
      });
      console.log(`✓ ${user.name} → ${teamName}`);
    }
  }

  // 3. Calcular vencedores de rodada para cada bolão
  const pools = await prisma.pool.findMany({ select: { id: true, name: true } });

  for (const pool of pools) {
    console.log(`\nProcessando bolão: ${pool.name}`);

    // Buscar rodadas com jogos encerrados neste bolão
    const rounds = await prisma.round.findMany({
      where: {
        championship: { pools: { some: { id: pool.id } } },
        matches: { some: { status: 'FINISHED' } },
      },
      include: {
        matches: {
          where: { status: 'FINISHED' },
          select: { id: true },
        },
      },
    });

    console.log(`  ${rounds.length} rodadas com jogos encerrados`);

    for (const round of rounds) {
      // Buscar palpites desta rodada neste bolão
      const predictions = await prisma.prediction.findMany({
        where: {
          matchId: { in: round.matches.map(m => m.id) },
          poolId: pool.id,
        },
        select: {
          userId: true,
          points: true,
        },
      });

      if (predictions.length === 0) {
        console.log(`  Rodada ${round.name}: sem palpites`);
        continue;
      }

      // Agrupar pontos por usuário
      const userPoints = new Map();
      for (const pred of predictions) {
        const existing = userPoints.get(pred.userId);
        if (existing) {
          existing.points += pred.points || 0;
        } else {
          userPoints.set(pred.userId, { userId: pred.userId, points: pred.points || 0 });
        }
      }

      // Encontrar vencedor(es)
      const sorted = [...userPoints.values()].sort((a, b) => b.points - a.points);
      const maxPts = sorted[0].points;

      if (maxPts === 0) {
        console.log(`  Rodada ${round.name}: todos com 0 pts, sem vencedor`);
        continue;
      }

      const winners = sorted.filter(u => u.points === maxPts);

      // Limpar vencedores anteriores desta rodada neste bolão
      await prisma.roundWinner.deleteMany({
        where: { roundId: round.id, poolId: pool.id },
      });

      // Buscar dados dos usuários vencedores
      const winnerUsers = await prisma.user.findMany({
        where: { id: { in: winners.map(w => w.userId) } },
        select: { id: true, name: true, favoriteTeam: true },
      });

      // Persistir vencedores
      for (const winner of winners) {
        const winnerUser = winnerUsers.find(u => u.id === winner.userId);
        const favoriteTeam = winnerUser ? winnerUser.favoriteTeam : null;

        await prisma.roundWinner.create({
          data: {
            roundId: round.id,
            userId: winner.userId,
            poolId: pool.id,
            favoriteTeam: favoriteTeam,
            roundPoints: winner.points,
          },
        });
        console.log(`  ✓ Rodada ${round.name}: ${winnerUser ? winnerUser.name : winner.userId} (${winner.points} pts) → time: ${favoriteTeam || '—'}`);
      }
    }
  }

  // 4. Verificar resultado final
  const allWinners = await prisma.roundWinner.findMany({
    include: {
      user: { select: { name: true } },
      round: { select: { name: true } },
      pool: { select: { name: true } },
    },
  });
  console.log('\n📊 Vencedores registrados:');
  allWinners.forEach(w => {
    console.log(`  ${w.pool.name} | ${w.round.name} | ${w.user.name} | ${w.roundPoints} pts | time: ${w.favoriteTeam || '—'}`);
  });

  console.log('\n✅ Configuração concluída!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
