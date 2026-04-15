// ============================================================
// Na Gaveta — Seed v4
// 3 rodadas com cenários distintos para validar:
//   - Ranking geral com desempate em 4 critérios
//   - Ranking por rodada
//   - Destaques da rodada (highlights)
//   - Histórico do usuário
//   - Bloqueio de palpites (partidas LIVE/FINISHED)
// Execute: npm run db:seed
// ============================================================

import { PrismaClient, MatchStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculateScore } from '../src/services/scoring.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed v4...\n');

  // ── Limpar banco na ordem correta de FK ──────────────────────
  await prisma.prediction.deleteMany();
  await prisma.poolMember.deleteMany();
  await prisma.scoreRule.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.match.deleteMany();
  await prisma.round.deleteMany();
  await prisma.championship.deleteMany();
  await prisma.user.deleteMany();

  // ── Usuários ─────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('senha123', 12);

  const userAdmin = await prisma.user.create({
    data: { name: 'Admin Na Gaveta', email: 'admin@nagaveta.com', passwordHash },
  });
  const userJoao = await prisma.user.create({
    data: { name: 'João Silva', email: 'joao@nagaveta.com', passwordHash },
  });
  const userMaria = await prisma.user.create({
    data: { name: 'Maria Souza', email: 'maria@nagaveta.com', passwordHash },
  });
  const userPedro = await prisma.user.create({
    data: { name: 'Pedro Costa', email: 'pedro@nagaveta.com', passwordHash },
  });

  console.log('✅ Usuários criados (senha: senha123)');

  // ── Campeonatos ───────────────────────────────────────────────
  const brasileirao = await prisma.championship.create({
    data: {
      name: 'Brasileirão Série A 2026',
      slug: 'brasileirao-serie-a-2026',
      season: '2026',
      country: 'Brasil',
      isActive: true,
      startDate: new Date('2026-04-05'),
      endDate: new Date('2026-12-07'),
    },
  });

  const copaBrasil = await prisma.championship.create({
    data: {
      name: 'Copa do Brasil 2026',
      slug: 'copa-do-brasil-2026',
      season: '2026',
      country: 'Brasil',
      isActive: true,
      startDate: new Date('2026-02-05'),
      endDate: new Date('2026-11-15'),
    },
  });

  console.log('✅ Campeonatos criados');

  // ── Rodadas ───────────────────────────────────────────────────
  const round1 = await prisma.round.create({
    data: {
      championshipId: brasileirao.id,
      number: 1,
      name: 'Rodada 1',
      startDate: new Date('2026-04-05'),
      endDate: new Date('2026-04-06'),
      isOpen: false,
      isBonusRound: false,
    },
  });

  const round2 = await prisma.round.create({
    data: {
      championshipId: brasileirao.id,
      number: 2,
      name: 'Rodada 2',
      startDate: new Date('2026-04-12'),
      endDate: new Date('2026-04-14'),
      isOpen: true,
      isBonusRound: false,
    },
  });

  const round3 = await prisma.round.create({
    data: {
      championshipId: brasileirao.id,
      number: 3,
      name: 'Rodada 3 — Especial',
      startDate: new Date('2026-04-19'),
      endDate: new Date('2026-04-21'),
      isOpen: false,
      isBonusRound: true,
    },
  });

  const roundCopa = await prisma.round.create({
    data: {
      championshipId: copaBrasil.id,
      number: 1,
      name: 'Oitavas de Final',
      startDate: new Date('2026-04-15'),
      endDate: new Date('2026-04-16'),
      isOpen: true,
      isBonusRound: false,
    },
  });

  console.log('✅ Rodadas criadas');

  // ── Partidas ──────────────────────────────────────────────────
  const now = new Date();
  const pastDate = (daysAgo: number, hour = 16) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const futureDate = (daysAhead: number, hour = 16) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  // Rodada 1 — 3 partidas FINALIZADAS
  const match1 = await prisma.match.create({
    data: {
      roundId: round1.id,
      homeTeam: 'Flamengo',
      awayTeam: 'Corinthians',
      homeScore: 2,
      awayScore: 1,
      status: MatchStatus.FINISHED,
      isJoker: false,
      matchDate: pastDate(10, 16),
      venue: 'Maracanã, Rio de Janeiro',
    },
  });

  const match2 = await prisma.match.create({
    data: {
      roundId: round1.id,
      homeTeam: 'Palmeiras',
      awayTeam: 'São Paulo',
      homeScore: 1,
      awayScore: 1,
      status: MatchStatus.FINISHED,
      isJoker: true, // coringa: pontos x2
      matchDate: pastDate(10, 19),
      venue: 'Allianz Parque, São Paulo',
    },
  });

  const match3 = await prisma.match.create({
    data: {
      roundId: round1.id,
      homeTeam: 'Atlético-MG',
      awayTeam: 'Cruzeiro',
      homeScore: 3,
      awayScore: 0,
      status: MatchStatus.FINISHED,
      isJoker: false,
      matchDate: pastDate(9, 18),
      venue: 'Arena MRV, Belo Horizonte',
    },
  });

  // Rodada 2 — 1 LIVE, 1 FINISHED, 2 SCHEDULED
  const match4 = await prisma.match.create({
    data: {
      roundId: round2.id,
      homeTeam: 'Flamengo',
      awayTeam: 'Palmeiras',
      homeScore: null,
      awayScore: null,
      status: MatchStatus.LIVE,
      isJoker: false,
      matchDate: pastDate(0, 15),
      venue: 'Maracanã, Rio de Janeiro',
    },
  });

  const match5 = await prisma.match.create({
    data: {
      roundId: round2.id,
      homeTeam: 'Corinthians',
      awayTeam: 'Santos',
      homeScore: 2,
      awayScore: 0,
      status: MatchStatus.FINISHED,
      isJoker: false,
      matchDate: pastDate(1, 16),
      venue: 'Neo Química Arena, São Paulo',
    },
  });

  const match6 = await prisma.match.create({
    data: {
      roundId: round2.id,
      homeTeam: 'Grêmio',
      awayTeam: 'Internacional',
      homeScore: null,
      awayScore: null,
      status: MatchStatus.SCHEDULED,
      isJoker: false,
      matchDate: futureDate(2, 16),
      venue: 'Arena do Grêmio, Porto Alegre',
    },
  });

  const match7 = await prisma.match.create({
    data: {
      roundId: round2.id,
      homeTeam: 'Botafogo',
      awayTeam: 'Vasco',
      homeScore: null,
      awayScore: null,
      status: MatchStatus.SCHEDULED,
      isJoker: true, // clássico carioca coringa
      matchDate: futureDate(3, 19),
      venue: 'Nilton Santos, Rio de Janeiro',
    },
  });

  // Rodada 3 — futuras (bônus)
  await prisma.match.createMany({
    data: [
      {
        roundId: round3.id,
        homeTeam: 'Grêmio',
        awayTeam: 'Internacional',
        status: MatchStatus.SCHEDULED,
        isJoker: false,
        matchDate: futureDate(10, 17),
        venue: 'Arena do Grêmio, Porto Alegre',
      },
      {
        roundId: round3.id,
        homeTeam: 'Santos',
        awayTeam: 'Vasco',
        status: MatchStatus.SCHEDULED,
        isJoker: false,
        matchDate: futureDate(10, 19),
        venue: 'Vila Belmiro, Santos',
      },
    ],
  });

  // Copa do Brasil
  await prisma.match.createMany({
    data: [
      {
        roundId: roundCopa.id,
        homeTeam: 'Flamengo',
        awayTeam: 'Athletico-PR',
        status: MatchStatus.SCHEDULED,
        isJoker: false,
        matchDate: futureDate(7, 21),
        venue: 'Maracanã, Rio de Janeiro',
      },
      {
        roundId: roundCopa.id,
        homeTeam: 'Palmeiras',
        awayTeam: 'Fortaleza',
        status: MatchStatus.SCHEDULED,
        isJoker: false,
        matchDate: futureDate(8, 19),
        venue: 'Allianz Parque, São Paulo',
      },
    ],
  });

  console.log('✅ Partidas criadas');

  // ── Bolões ────────────────────────────────────────────────────
  const poolPublico = await prisma.pool.create({
    data: {
      name: 'Bolão do Brasileirão 2026',
      code: 'BRAS26',
      description: 'Bolão público para o Brasileirão Série A 2026. Todos são bem-vindos!',
      isPublic: true,
      ownerId: userAdmin.id,
      championshipId: brasileirao.id,
      scoreRule: {
        create: {
          pointsForOutcome: 10,
          pointsForHomeGoals: 5,
          pointsForAwayGoals: 5,
          exactScoreBonus: 5,
          jokerMultiplier: 2,
          bonusRoundMultiplier: 2,
        },
      },
      members: {
        createMany: {
          data: [
            { userId: userAdmin.id, score: 0 },
            { userId: userJoao.id, score: 0 },
            { userId: userMaria.id, score: 0 },
            { userId: userPedro.id, score: 0 },
          ],
        },
      },
    },
  });

  const poolCopa = await prisma.pool.create({
    data: {
      name: 'Copa do Brasil — Galera do Bar',
      code: 'COPA26',
      description: 'Bolão da Copa do Brasil 2026. Vem palpitar!',
      isPublic: true,
      ownerId: userAdmin.id,
      championshipId: copaBrasil.id,
      scoreRule: {
        create: {
          pointsForOutcome: 10,
          pointsForHomeGoals: 5,
          pointsForAwayGoals: 5,
          exactScoreBonus: 10,
          jokerMultiplier: 2,
          bonusRoundMultiplier: 2,
        },
      },
      members: {
        createMany: {
          data: [{ userId: userAdmin.id, score: 0 }],
        },
      },
    },
  });

  console.log('✅ Bolões criados');

  // ── Palpites com pontuação calculada ─────────────────────────
  const rule = await prisma.scoreRule.findUnique({ where: { poolId: poolPublico.id } });
  if (!rule) throw new Error('ScoreRule não encontrada');

  // Resultados reais da rodada 1:
  // match1: Flamengo 2x1 Corinthians (normal)
  // match2: Palmeiras 1x1 São Paulo (CORINGA x2)
  // match3: Atlético-MG 3x0 Cruzeiro (normal)

  type PredEntry = {
    userId: string;
    matchId: string;
    homeScoreTip: number;
    awayScoreTip: number;
    matchHomeScore: number;
    matchAwayScore: number;
    isJoker: boolean;
    isBonusRound: boolean;
  };

  const r1Preds: PredEntry[] = [
    // João: acerta exato em match1 e match2 (coringa), acerta resultado em match3
    { userId: userJoao.id, matchId: match1.id, homeScoreTip: 2, awayScoreTip: 1, matchHomeScore: 2, matchAwayScore: 1, isJoker: false, isBonusRound: false },
    { userId: userJoao.id, matchId: match2.id, homeScoreTip: 1, awayScoreTip: 1, matchHomeScore: 1, matchAwayScore: 1, isJoker: true,  isBonusRound: false },
    { userId: userJoao.id, matchId: match3.id, homeScoreTip: 2, awayScoreTip: 0, matchHomeScore: 3, matchAwayScore: 0, isJoker: false, isBonusRound: false },

    // Maria: acerta resultado em todos, erra placares
    { userId: userMaria.id, matchId: match1.id, homeScoreTip: 1, awayScoreTip: 0, matchHomeScore: 2, matchAwayScore: 1, isJoker: false, isBonusRound: false },
    { userId: userMaria.id, matchId: match2.id, homeScoreTip: 2, awayScoreTip: 2, matchHomeScore: 1, matchAwayScore: 1, isJoker: true,  isBonusRound: false },
    { userId: userMaria.id, matchId: match3.id, homeScoreTip: 1, awayScoreTip: 0, matchHomeScore: 3, matchAwayScore: 0, isJoker: false, isBonusRound: false },

    // Pedro: acerta 1 resultado, erra os outros
    { userId: userPedro.id, matchId: match1.id, homeScoreTip: 0, awayScoreTip: 2, matchHomeScore: 2, matchAwayScore: 1, isJoker: false, isBonusRound: false },
    { userId: userPedro.id, matchId: match2.id, homeScoreTip: 2, awayScoreTip: 0, matchHomeScore: 1, matchAwayScore: 1, isJoker: true,  isBonusRound: false },
    { userId: userPedro.id, matchId: match3.id, homeScoreTip: 3, awayScoreTip: 0, matchHomeScore: 3, matchAwayScore: 0, isJoker: false, isBonusRound: false },
    // Admin: não palpitou na rodada 1
  ];

  for (const p of r1Preds) {
    const breakdown = calculateScore({
      prediction: { homeScoreTip: p.homeScoreTip, awayScoreTip: p.awayScoreTip },
      match: { homeScore: p.matchHomeScore, awayScore: p.matchAwayScore, isJoker: p.isJoker },
      round: { isBonusRound: p.isBonusRound },
      rule,
    });

    await prisma.prediction.create({
      data: {
        userId: p.userId,
        matchId: p.matchId,
        poolId: poolPublico.id,
        homeScoreTip: p.homeScoreTip,
        awayScoreTip: p.awayScoreTip,
        points: breakdown.points,
        scoredAt: new Date(),
      },
    });

    await prisma.poolMember.updateMany({
      where: { userId: p.userId, poolId: poolPublico.id },
      data: { score: { increment: breakdown.points } },
    });
  }

  // Rodada 2 — palpites na partida FINISHED (match5: Corinthians 2x0 Santos)
  const r2Preds: PredEntry[] = [
    // João: acerta exato
    { userId: userJoao.id, matchId: match5.id, homeScoreTip: 2, awayScoreTip: 0, matchHomeScore: 2, matchAwayScore: 0, isJoker: false, isBonusRound: false },
    // Maria: acerta resultado
    { userId: userMaria.id, matchId: match5.id, homeScoreTip: 1, awayScoreTip: 0, matchHomeScore: 2, matchAwayScore: 0, isJoker: false, isBonusRound: false },
    // Pedro: erra tudo
    { userId: userPedro.id, matchId: match5.id, homeScoreTip: 0, awayScoreTip: 1, matchHomeScore: 2, matchAwayScore: 0, isJoker: false, isBonusRound: false },
  ];

  for (const p of r2Preds) {
    const breakdown = calculateScore({
      prediction: { homeScoreTip: p.homeScoreTip, awayScoreTip: p.awayScoreTip },
      match: { homeScore: p.matchHomeScore, awayScore: p.matchAwayScore, isJoker: p.isJoker },
      round: { isBonusRound: p.isBonusRound },
      rule,
    });

    await prisma.prediction.create({
      data: {
        userId: p.userId,
        matchId: p.matchId,
        poolId: poolPublico.id,
        homeScoreTip: p.homeScoreTip,
        awayScoreTip: p.awayScoreTip,
        points: breakdown.points,
        scoredAt: new Date(),
      },
    });

    await prisma.poolMember.updateMany({
      where: { userId: p.userId, poolId: poolPublico.id },
      data: { score: { increment: breakdown.points } },
    });
  }

  // Palpites abertos na rodada 2 (jogos futuros — sem resultado)
  await prisma.prediction.createMany({
    data: [
      { userId: userJoao.id, matchId: match6.id, poolId: poolPublico.id, homeScoreTip: 2, awayScoreTip: 1, points: 0 },
      { userId: userMaria.id, matchId: match6.id, poolId: poolPublico.id, homeScoreTip: 0, awayScoreTip: 0, points: 0 },
      { userId: userJoao.id, matchId: match7.id, poolId: poolPublico.id, homeScoreTip: 1, awayScoreTip: 2, points: 0 },
      { userId: userPedro.id, matchId: match7.id, poolId: poolPublico.id, homeScoreTip: 2, awayScoreTip: 2, points: 0 },
    ],
  });

  console.log('✅ Palpites e pontuação calculados');

  // ── Resumo final ──────────────────────────────────────────────
  const members = await prisma.poolMember.findMany({
    where: { poolId: poolPublico.id },
    include: { user: { select: { name: true } } },
    orderBy: { score: 'desc' },
  });

  console.log('\n📊 Ranking atual do Brasileirão:');
  members.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.user.name}: ${m.score} pts`);
  });

  console.log('\n🎉 Seed v4 concluído com sucesso!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('   admin@nagaveta.com  | senha123');
  console.log('   joao@nagaveta.com   | senha123');
  console.log('   maria@nagaveta.com  | senha123');
  console.log('   pedro@nagaveta.com  | senha123');
  console.log('\n📋 Códigos de bolão:');
  console.log('   BRAS26 — Bolão do Brasileirão 2026 (público)');
  console.log('   COPA26 — Copa do Brasil (público)');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
