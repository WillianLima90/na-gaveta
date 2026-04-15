// Script para criar palpites reais com gols para testar o sistema de resultados
// Cenários: placar exato, resultado certo, parcial, erro

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // Buscar usuários
  const users = await db.user.findMany({
    where: { email: { in: ['joao@nagaveta.com', 'maria@nagaveta.com', 'pedro@nagaveta.com', 'admin@nagaveta.com'] } },
    select: { id: true, name: true, email: true },
  });
  console.log('Usuários:', users.map(u => `${u.name} (${u.id.substring(0,8)})`));

  // Buscar o bolão do Brasileirão
  const pool = await db.pool.findFirst({
    where: { name: { contains: 'Brasileirão' } },
    include: { scoreRule: true },
  });
  if (!pool) throw new Error('Bolão não encontrado');
  console.log('Bolão:', pool.name, pool.id.substring(0,8));

  // Buscar rodadas com jogos encerrados
  const rounds = await db.round.findMany({
    where: { championshipId: 'bdc291fb-5642-4e39-920c-a1f38423e3d3' },
    include: { matches: true },
    orderBy: { startDate: 'asc' },
  });

  const finishedMatches = rounds.flatMap(r => r.matches.filter(m => m.status === 'FINISHED'));
  console.log('Jogos encerrados:', finishedMatches.length);

  // Mapa de userId por email
  const userByEmail = new Map(users.map(u => [u.email, u]));
  const joao = userByEmail.get('joao@nagaveta.com');
  const maria = userByEmail.get('maria@nagaveta.com');
  const pedro = userByEmail.get('pedro@nagaveta.com');
  const admin = userByEmail.get('admin@nagaveta.com');

  if (!joao || !maria || !pedro || !admin) {
    throw new Error('Usuários não encontrados: ' + JSON.stringify(users.map(u => u.email)));
  }

  // Definir palpites por jogo com cenários variados
  // Jogos encerrados:
  // R1: Flamengo 2-1 Corinthians, Palmeiras 1-1 São Paulo, Atlético-MG 3-0 Cruzeiro
  // R2: Corinthians 2-0 Santos
  // R3: Grêmio 2-2 Internacional, Santos 2-1 Vasco

  const matchId = (homeTeam: string) => finishedMatches.find(m => m.homeTeam === homeTeam)?.id;

  const flamengoId = matchId('Flamengo'); // 2-1
  const palmeirasId = matchId('Palmeiras'); // 1-1
  const atleticoId = matchId('Atlético-MG'); // 3-0
  const corinthiansId = matchId('Corinthians'); // 2-0
  const gremioId = matchId('Grêmio'); // 2-2
  const santosId = matchId('Santos'); // 2-1

  console.log('IDs dos jogos:', { flamengoId, palmeirasId, atleticoId, corinthiansId, gremioId, santosId });

  // Palpites por usuário:
  // João: líder — acerta muito
  // Maria: segundo — acerta razoável
  // Pedro: terceiro — acerta pouco
  // Admin: quarto — não acerta nada (ou quase)

  const predictions = [
    // ── JOÃO SILVA (líder) ──────────────────────────────────
    // R1: Flamengo 2-1 (EXATO ✅)
    { matchId: flamengoId, userId: joao.id, homeScoreTip: 2, awayScoreTip: 1 },
    // R1: Palmeiras 1-1 (EXATO ✅)
    { matchId: palmeirasId, userId: joao.id, homeScoreTip: 1, awayScoreTip: 1 },
    // R1: Atlético-MG 3-0 (EXATO ✅)
    { matchId: atleticoId, userId: joao.id, homeScoreTip: 3, awayScoreTip: 0 },
    // R2: Corinthians 2-0 (EXATO ✅)
    { matchId: corinthiansId, userId: joao.id, homeScoreTip: 2, awayScoreTip: 0 },
    // R3: Grêmio 2-2 (EXATO ✅)
    { matchId: gremioId, userId: joao.id, homeScoreTip: 2, awayScoreTip: 2 },
    // R3: Santos 2-1 (EXATO ✅)
    { matchId: santosId, userId: joao.id, homeScoreTip: 2, awayScoreTip: 1 },

    // ── MARIA SOUZA (segundo) ────────────────────────────────
    // R1: Flamengo 2-0 (resultado certo, gols parciais)
    { matchId: flamengoId, userId: maria.id, homeScoreTip: 2, awayScoreTip: 0 },
    // R1: Palmeiras 0-0 (resultado certo empate, gols errados)
    { matchId: palmeirasId, userId: maria.id, homeScoreTip: 0, awayScoreTip: 0 },
    // R1: Atlético-MG 2-0 (resultado certo, gols parciais)
    { matchId: atleticoId, userId: maria.id, homeScoreTip: 2, awayScoreTip: 0 },
    // R2: Corinthians 1-0 (resultado certo, gols parciais)
    { matchId: corinthiansId, userId: maria.id, homeScoreTip: 1, awayScoreTip: 0 },
    // R3: Grêmio 1-1 (resultado certo empate, gols errados)
    { matchId: gremioId, userId: maria.id, homeScoreTip: 1, awayScoreTip: 1 },
    // R3: Santos 1-0 (resultado certo, gols errados)
    { matchId: santosId, userId: maria.id, homeScoreTip: 1, awayScoreTip: 0 },

    // ── PEDRO COSTA (terceiro) ───────────────────────────────
    // R1: Flamengo 1-2 (ERRO — virada errada)
    { matchId: flamengoId, userId: pedro.id, homeScoreTip: 1, awayScoreTip: 2 },
    // R1: Palmeiras 2-0 (ERRO — resultado errado)
    { matchId: palmeirasId, userId: pedro.id, homeScoreTip: 2, awayScoreTip: 0 },
    // R1: Atlético-MG 1-0 (resultado certo, gols parciais)
    { matchId: atleticoId, userId: pedro.id, homeScoreTip: 1, awayScoreTip: 0 },
    // R2: Corinthians 0-1 (ERRO — virada errada)
    { matchId: corinthiansId, userId: pedro.id, homeScoreTip: 0, awayScoreTip: 1 },
    // R3: Grêmio 3-1 (ERRO — resultado errado)
    { matchId: gremioId, userId: pedro.id, homeScoreTip: 3, awayScoreTip: 1 },
    // R3: Santos 2-1 (EXATO ✅)
    { matchId: santosId, userId: pedro.id, homeScoreTip: 2, awayScoreTip: 1 },

    // ── ADMIN (quarto) ───────────────────────────────────────
    // R1: Flamengo 0-0 (ERRO total)
    { matchId: flamengoId, userId: admin.id, homeScoreTip: 0, awayScoreTip: 0 },
    // R1: Palmeiras 3-1 (ERRO — resultado errado)
    { matchId: palmeirasId, userId: admin.id, homeScoreTip: 3, awayScoreTip: 1 },
    // R1: Atlético-MG 0-1 (ERRO total)
    { matchId: atleticoId, userId: admin.id, homeScoreTip: 0, awayScoreTip: 1 },
    // R2: Corinthians 1-1 (ERRO — resultado errado)
    { matchId: corinthiansId, userId: admin.id, homeScoreTip: 1, awayScoreTip: 1 },
    // R3: Grêmio 0-0 (resultado certo empate, gols errados)
    { matchId: gremioId, userId: admin.id, homeScoreTip: 0, awayScoreTip: 0 },
    // R3: Santos 0-2 (ERRO — virada errada)
    { matchId: santosId, userId: admin.id, homeScoreTip: 0, awayScoreTip: 2 },
  ].filter(p => p.matchId); // filtrar se matchId não encontrado

  console.log('Palpites a criar/atualizar:', predictions.length);

  // Upsert cada palpite (atualizar se já existe, criar se não)
  let updated = 0;
  let created = 0;
  for (const pred of predictions) {
    if (!pred.matchId) continue;
    const existing = await db.prediction.findFirst({
      where: { matchId: pred.matchId, userId: pred.userId, poolId: pool.id },
    });
    if (existing) {
      await db.prediction.update({
        where: { id: existing.id },
        data: { homeScoreTip: pred.homeScoreTip, awayScoreTip: pred.awayScoreTip },
      });
      updated++;
    } else {
      await db.prediction.create({
        data: {
          matchId: pred.matchId,
          userId: pred.userId,
          poolId: pool.id,
          homeScoreTip: pred.homeScoreTip,
          awayScoreTip: pred.awayScoreTip,
        },
      });
      created++;
    }
  }

  console.log(`✅ Palpites: ${created} criados, ${updated} atualizados`);

  // Recalcular pontos para todos os jogos encerrados
  const scoreRule = pool.scoreRule;
  if (!scoreRule) {
    console.log('⚠️ Sem regras de pontuação — pulando cálculo de pontos');
    return;
  }

  console.log('Recalculando pontos...');
  let pointsUpdated = 0;
  for (const match of finishedMatches) {
    if (match.homeScore === null || match.awayScore === null) continue;
    const matchPredictions = await db.prediction.findMany({
      where: { matchId: match.id, poolId: pool.id },
    });

    for (const pred of matchPredictions) {
      if (pred.homeScoreTip === null || pred.awayScoreTip === null) continue;

      let points = 0;
      const realHome = match.homeScore;
      const realAway = match.awayScore;
      const predHome = pred.homeScoreTip;
      const predAway = pred.awayScoreTip;

      // Resultado (V/E/D)
      const realOutcome = realHome > realAway ? 'H' : realHome < realAway ? 'A' : 'D';
      const predOutcome = predHome > predAway ? 'H' : predHome < predAway ? 'A' : 'D';
      if (realOutcome === predOutcome) points += scoreRule.pointsForOutcome;

      // Gols do mandante
      if (predHome === realHome) points += scoreRule.pointsForHomeGoals;

      // Gols do visitante
      if (predAway === realAway) points += scoreRule.pointsForAwayGoals;

      // Bônus placar exato
      if (predHome === realHome && predAway === realAway) points += scoreRule.exactScoreBonus;

      // Multiplicadores
      if (match.isJoker) points = Math.round(points * scoreRule.jokerMultiplier);

      await db.prediction.update({
        where: { id: pred.id },
        data: { points },
      });
      pointsUpdated++;
    }
  }

  console.log(`✅ Pontos recalculados: ${pointsUpdated} palpites`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
