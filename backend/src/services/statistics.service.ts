// ============================================================
// Na Gaveta — Statistics Service
// Toda lógica de estatísticas, desempate e ranking passa aqui.
// Nunca espalhar cálculos nos controllers.
// ============================================================

import prisma from '../utils/prisma';
import { calculateScore } from './scoring.service';

// ── Tipos exportados ──────────────────────────────────────────

export interface UserStats {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  favoriteTeam?: string | null;
  totalPoints: number;
  exactScores: number;       // acertou placar exato
  correctOutcomes: number;   // acertou resultado (V/E/D)
  totalPredictions: number;
  scoredPredictions: number; // palpites já pontuados
  missedPredictions: number; // palpites pontuados com 0 pts
}

export interface RankingEntry extends UserStats {
  position: number;
  isCurrentUser: boolean;
}

export interface RoundRankingEntry {
  position: number;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  favoriteTeam?: string | null;
  roundPoints: number;
  exactScores: number;
  correctOutcomes: number;
  totalPredictions: number;
  isCurrentUser: boolean;
}

export interface RoundHighlights {
  roundId: string;
  roundName: string;
  totalParticipants: number;
  bestUser: {
    userId: string;
    name: string;
    avatarUrl?: string | null;
    roundPoints: number;
    exactScores: number;
  } | null;
  topScore: number;
  averageScore: number;
  totalExactScores: number;
  totalCorrectOutcomes: number;
  totalPredictions: number;
}

export interface UserRoundHistory {
  roundId: string;
  roundNumber: number;
  roundName: string;
  isBonusRound: boolean;
  points: number;
  exactScores: number;
  correctOutcomes: number;
  totalPredictions: number;
}

export interface UserPoolHistory {
  userId: string;
  name: string;
  totalPoints: number;
  exactScores: number;
  correctOutcomes: number;
  totalPredictions: number;
  rounds: UserRoundHistory[];
}

// ── Helpers internos ──────────────────────────────────────────

/**
 * Determina se um palpite acertou o resultado (V/E/D)
 */
function isCorrectOutcome(
  homeScoreTip: number, awayScoreTip: number,
  homeScore: number, awayScore: number
): boolean {
  const getOutcome = (h: number, a: number) => h > a ? 'home' : a > h ? 'away' : 'draw';
  return getOutcome(homeScoreTip, awayScoreTip) === getOutcome(homeScore, awayScore);
}

/**
 * Determina se um palpite acertou o placar exato
 */
function isExactScore(
  homeScoreTip: number, awayScoreTip: number,
  homeScore: number, awayScore: number
): boolean {
  return homeScoreTip === homeScore && awayScoreTip === awayScore;
}

// ── Funções principais ────────────────────────────────────────

/**
 * Calcula estatísticas completas de todos os membros de um bolão.
 * Usado para ranking geral com desempate.
 */
export async function getMemberStats(
  poolId: string,
  currentUserId?: string
): Promise<RankingEntry[]> {
  const members = await prisma.poolMember.findMany({
    where: { poolId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, favoriteTeam: true } },
    },
  });

  const statsPerMember = await Promise.all(
    members.map(async (member) => {
      const predictions = await prisma.prediction.findMany({
        where: { userId: member.userId, poolId },
        include: {
          match: {
            select: {
              homeScore: true,
              awayScore: true,
              status: true,
            },
          },
        },
      });

      const scored = predictions.filter((p) => p.scoredAt !== null);
      let exactScores = 0;
      let correctOutcomes = 0;
      let missedPredictions = 0;

      for (const p of scored) {
        const hScore = p.match.homeScore;
        const aScore = p.match.awayScore;
        if (hScore === null || aScore === null) continue;

        if (isExactScore(p.homeScoreTip, p.awayScoreTip, hScore, aScore)) exactScores++;
        if (isCorrectOutcome(p.homeScoreTip, p.awayScoreTip, hScore, aScore)) correctOutcomes++;
        if ((p.points ?? 0) === 0) missedPredictions++;
      }

      return {
        userId: member.userId,
        name: member.user.name,
        avatarUrl: member.user.avatarUrl,
        favoriteTeam: member.user.favoriteTeam ?? null,
        totalPoints: member.score,
        exactScores,
        correctOutcomes,
        totalPredictions: predictions.length,
        scoredPredictions: scored.length,
        missedPredictions,
        isCurrentUser: member.userId === currentUserId,
      };
    })
  );

  // Ordenação com desempate em 4 critérios:
  // 1. Total de pontos (maior primeiro)
  // 2. Acertos exatos (maior primeiro)
  // 3. Acertos de resultado (maior primeiro)
  // 4. Menor quantidade de erros totais
  statsPerMember.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    if (b.correctOutcomes !== a.correctOutcomes) return b.correctOutcomes - a.correctOutcomes;
    return a.missedPredictions - b.missedPredictions;
  });

  return statsPerMember.map((s, i) => ({ ...s, position: i + 1 }));
}

/**
 * Calcula ranking de uma rodada específica dentro de um bolão.
 * Desempate: acertos exatos > acertos de resultado.
 */
export async function getRoundRanking(
  poolId: string,
  roundId: string,
  currentUserId?: string
): Promise<RoundRankingEntry[]> {
  // Buscar membros do bolão
  const members = await prisma.poolMember.findMany({
    where: { poolId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, favoriteTeam: true } },
    },
  });

  // Buscar palpites desta rodada para todos os membros
  const predictions = await prisma.prediction.findMany({
    where: {
      poolId,
      match: { roundId },
    },
    include: {
      match: {
        select: {
          homeScore: true,
          awayScore: true,
          status: true,
          roundId: true,
        },
      },
    },
  });

  // Agrupar palpites por usuário
  const predictionsByUser = new Map<string, typeof predictions>();
  for (const p of predictions) {
    if (!predictionsByUser.has(p.userId)) predictionsByUser.set(p.userId, []);
    predictionsByUser.get(p.userId)!.push(p);
  }

  const entries: Omit<RoundRankingEntry, 'position'>[] = members.map((member) => {
    const userPredictions = predictionsByUser.get(member.userId) ?? [];
    const scored = userPredictions.filter((p) => p.scoredAt !== null);

    let roundPoints = 0;
    let exactScores = 0;
    let correctOutcomes = 0;

    for (const p of scored) {
      roundPoints += p.points ?? 0;
      const hScore = p.match.homeScore;
      const aScore = p.match.awayScore;
      if (hScore === null || aScore === null) continue;
      if (isExactScore(p.homeScoreTip, p.awayScoreTip, hScore, aScore)) exactScores++;
      if (isCorrectOutcome(p.homeScoreTip, p.awayScoreTip, hScore, aScore)) correctOutcomes++;
    }

    return {
      userId: member.userId,
      name: member.user.name,
      avatarUrl: member.user.avatarUrl,
      favoriteTeam: member.user.favoriteTeam ?? null,
      roundPoints,
      exactScores,
      correctOutcomes,
      totalPredictions: userPredictions.length,
      isCurrentUser: member.userId === currentUserId,
    };
  });

  // Ordenação: pontos > acertos exatos > acertos de resultado
  entries.sort((a, b) => {
    if (b.roundPoints !== a.roundPoints) return b.roundPoints - a.roundPoints;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    return b.correctOutcomes - a.correctOutcomes;
  });

  return entries.map((e, i) => ({ ...e, position: i + 1 }));
}

/**
 * Calcula os destaques de uma rodada: melhor usuário, maior pontuação,
 * totais de acertos exatos, acertos de resultado e participantes.
 */
export async function getRoundHighlights(
  poolId: string,
  roundId: string
): Promise<RoundHighlights> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true, name: true },
  });

  if (!round) throw new Error('Rodada não encontrada');

  const ranking = await getRoundRanking(poolId, roundId);

  const participants = ranking.filter((r) => r.totalPredictions > 0);
  const topScore = participants.length > 0 ? participants[0].roundPoints : 0;
  const totalExactScores = participants.reduce((acc, r) => acc + r.exactScores, 0);
  const totalCorrectOutcomes = participants.reduce((acc, r) => acc + r.correctOutcomes, 0);
  const totalPredictions = participants.reduce((acc, r) => acc + r.totalPredictions, 0);
  const averageScore = participants.length > 0
    ? Math.round(participants.reduce((acc, r) => acc + r.roundPoints, 0) / participants.length)
    : 0;

  const bestUser = participants.length > 0 ? {
    userId: participants[0].userId,
    name: participants[0].name,
    avatarUrl: participants[0].avatarUrl,
    roundPoints: participants[0].roundPoints,
    exactScores: participants[0].exactScores,
  } : null;

  return {
    roundId,
    roundName: round.name,
    totalParticipants: participants.length,
    bestUser,
    topScore,
    averageScore,
    totalExactScores,
    totalCorrectOutcomes,
    totalPredictions,
  };
}

/**
 * Retorna o histórico completo de um usuário em um bolão,
 * detalhando pontos e acertos por rodada.
 */
export async function getUserPoolHistory(
  poolId: string,
  userId: string
): Promise<UserPoolHistory> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  if (!user) throw new Error('Usuário não encontrado');

  // Buscar todas as rodadas do campeonato do bolão
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      championship: {
        include: {
          rounds: {
            orderBy: { number: 'asc' },
          },
        },
      },
    },
  });

  if (!pool) throw new Error('Bolão não encontrado');

  const rounds = pool.championship.rounds;

  // Para cada rodada, buscar palpites do usuário
  const roundHistories: UserRoundHistory[] = await Promise.all(
    rounds.map(async (round) => {
      const predictions = await prisma.prediction.findMany({
        where: {
          userId,
          poolId,
          match: { roundId: round.id },
        },
        include: {
          match: {
            select: {
              homeScore: true,
              awayScore: true,
              status: true,
            },
          },
        },
      });

      const scored = predictions.filter((p) => p.scoredAt !== null);
      let points = 0;
      let exactScores = 0;
      let correctOutcomes = 0;

      for (const p of scored) {
        points += p.points ?? 0;
        const hScore = p.match.homeScore;
        const aScore = p.match.awayScore;
        if (hScore === null || aScore === null) continue;
        if (isExactScore(p.homeScoreTip, p.awayScoreTip, hScore, aScore)) exactScores++;
        if (isCorrectOutcome(p.homeScoreTip, p.awayScoreTip, hScore, aScore)) correctOutcomes++;
      }

      return {
        roundId: round.id,
        roundNumber: round.number,
        roundName: round.name,
        isBonusRound: pool.bonusRoundId === round.id,
        points,
        exactScores,
        correctOutcomes,
        totalPredictions: predictions.length,
      };
    })
  );

  // Totais acumulados
  const totalPoints = roundHistories.reduce((acc, r) => acc + r.points, 0);
  const totalExact = roundHistories.reduce((acc, r) => acc + r.exactScores, 0);
  const totalOutcomes = roundHistories.reduce((acc, r) => acc + r.correctOutcomes, 0);
  const totalPredictions = roundHistories.reduce((acc, r) => acc + r.totalPredictions, 0);

  return {
    userId,
    name: user.name,
    totalPoints,
    exactScores: totalExact,
    correctOutcomes: totalOutcomes,
    totalPredictions,
    rounds: roundHistories,
  };
}

// ── Summary do usuário ────────────────────────────────────────

export interface UserSummary {
  userId: string;
  name: string;
  poolId: string;
  poolName: string;
  position: number;
  totalPoints: number;
  totalMembers: number;
  leaderPoints: number;
  diffToLeader: number;
  rival: {
    userId: string;
    name: string;
    points: number;
    diffToRival: number;
  } | null;
  streak: number;           // acertos consecutivos mais recentes
  bestRoundPoints: number;  // maior pontuação em uma única rodada
  bestRoundName: string;
  exactScores: number;
  correctOutcomes: number;
  totalPredictions: number;
  pendingMatches: number;   // partidas abertas sem palpite
}

/**
 * Retorna o summary completo de engajamento de um usuário em um bolão.
 * Usado para pressão temporal, rival direto e destaques pessoais.
 */
export async function getUserSummary(
  poolId: string,
  userId: string
): Promise<UserSummary> {
  // Buscar bolão
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    select: { id: true, name: true, championshipId: true },
  });
  if (!pool) throw new Error('Bolão não encontrado');

  // Ranking geral para posição, rival e líder
  const ranking = await getMemberStats(poolId, userId);
  const myEntry = ranking.find((r) => r.userId === userId);
  if (!myEntry) throw new Error('Usuário não é membro deste bolão');

  const position = myEntry.position;
  const totalMembers = ranking.length;
  const leader = ranking[0];
  const leaderPoints = leader?.totalPoints ?? 0;
  const diffToLeader = leaderPoints - myEntry.totalPoints;

  // Rival: jogador imediatamente acima (posição - 1)
  let rival: UserSummary['rival'] = null;
  if (position > 1) {
    const rivalEntry = ranking[position - 2]; // posição - 1 (0-indexed)
    rival = {
      userId: rivalEntry.userId,
      name: rivalEntry.name,
      points: rivalEntry.totalPoints,
      diffToRival: rivalEntry.totalPoints - myEntry.totalPoints,
    };
  }

  // Histórico por rodada para streak e melhor rodada
  const history = await getUserPoolHistory(poolId, userId);
  const rounds = history.rounds;

  // Melhor rodada (maior pontuação)
  let bestRoundPoints = 0;
  let bestRoundName = '—';
  for (const r of rounds) {
    if (r.points > bestRoundPoints) {
      bestRoundPoints = r.points;
      bestRoundName = r.roundName;
    }
  }

  // Streak: calcular acertos consecutivos baseado nos palpites pontuados
  // Busca palpites pontuados ordenados por data de pontuação (mais recente primeiro)
  const scoredPredictions = await prisma.prediction.findMany({
    where: { userId, poolId, scoredAt: { not: null } },
    orderBy: { scoredAt: 'desc' },
    include: {
      match: { select: { homeScore: true, awayScore: true } },
    },
  });

  let streak = 0;
  for (const p of scoredPredictions) {
    const hScore = p.match.homeScore;
    const aScore = p.match.awayScore;
    if (hScore === null || aScore === null) break;
    const correct = isCorrectOutcome(p.homeScoreTip, p.awayScoreTip, hScore, aScore);
    if (correct) {
      streak++;
    } else {
      break; // sequência quebrada
    }
  }

  // Partidas abertas sem palpite do usuário (pendentes)
  const openMatches = await prisma.match.findMany({
    where: {
      round: { championship: { pools: { some: { id: poolId } } } },
      status: 'SCHEDULED',
      matchDate: { gt: new Date() },
    },
    select: { id: true },
  });

  const existingPredictions = await prisma.prediction.findMany({
    where: {
      userId,
      poolId,
      matchId: { in: openMatches.map((m) => m.id) },
    },
    select: { matchId: true },
  });

  const predictedMatchIds = new Set(existingPredictions.map((p) => p.matchId));
  const pendingMatches = openMatches.filter((m) => !predictedMatchIds.has(m.id)).length;

  return {
    userId,
    name: myEntry.name,
    poolId,
    poolName: pool.name,
    position,
    totalPoints: myEntry.totalPoints,
    totalMembers,
    leaderPoints,
    diffToLeader,
    rival,
    streak,
    bestRoundPoints,
    bestRoundName,
    exactScores: myEntry.exactScores,
    correctOutcomes: myEntry.correctOutcomes,
    totalPredictions: myEntry.totalPredictions,
    pendingMatches,
  };
}

// ── Tipos para RoundWinner ────────────────────────────────────

export interface RoundWinnerEntry {
  roundId: string;
  roundName: string;
  roundNumber: number;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  favoriteTeam?: string | null;
  roundPoints: number;
}

export interface UserRoundWins {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  wins: RoundWinnerEntry[];
  totalWins: number;
}

// ── Funções de RoundWinner ────────────────────────────────────

/**
 * Calcula e persiste os vencedores de todas as rodadas encerradas de um bolão.
 * Chamado após o fechamento de uma rodada.
 * Usa os mesmos critérios de desempate do ranking.
 */
export async function computeAndSaveRoundWinners(
  poolId: string
): Promise<void> {
  // Buscar o campeonato do bolão
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    select: { championshipId: true },
  });
  if (!pool) throw new Error('Bolão não encontrado');

  // Buscar todas as rodadas do campeonato
  const rounds = await prisma.round.findMany({
    where: { championshipId: pool.championshipId },
    select: { id: true, number: true, name: true },
    orderBy: { number: 'asc' },
  });

  for (const round of rounds) {
    // Verificar se todos os jogos da rodada estão encerrados
    const matches = await prisma.match.findMany({
      where: { roundId: round.id },
      select: { status: true },
    });

    const allFinished = matches.length > 0 &&
      matches.every((m) => m.status === 'FINISHED');

    if (!allFinished) continue; // Pular rodadas não encerradas

    // Calcular ranking da rodada
    const ranking = await getRoundRanking(poolId, round.id);

    if (ranking.length === 0) continue;

    // Identificar o(s) vencedor(es) — pode haver empate
    const topPoints = ranking[0].roundPoints;
    if (topPoints === 0) continue; // Ninguém pontuou

    const winners = ranking.filter((r) => r.roundPoints === topPoints);

    // Salvar vencedores (upsert para evitar duplicatas)
    for (const winner of winners) {
      // Buscar time do coração do usuário
      const user = await prisma.user.findUnique({
        where: { id: winner.userId },
        select: { favoriteTeam: true },
      });

      await prisma.roundWinner.upsert({
        where: {
          poolId_roundId_userId: {
            poolId,
            roundId: round.id,
            userId: winner.userId,
          },
        },
        create: {
          poolId,
          roundId: round.id,
          userId: winner.userId,
          favoriteTeam: user?.favoriteTeam ?? null,
          roundPoints: winner.roundPoints,
        },
        update: {
          favoriteTeam: user?.favoriteTeam ?? null,
          roundPoints: winner.roundPoints,
        },
      });
    }
  }
}

/**
 * Busca os vencedores de rodada de um bolão, agrupados por usuário.
 * Retorna dados prontos para renderização de escudos no frontend.
 */
export async function getPoolRoundWinners(
  poolId: string
): Promise<UserRoundWins[]> {
  const winners = await prisma.roundWinner.findMany({
    where: { poolId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, favoriteTeam: true } },
      round: { select: { id: true, number: true, name: true } },
    },
    orderBy: { round: { number: 'asc' } },
  });

  // Agrupar por usuário
  const byUser = new Map<string, UserRoundWins>();

  for (const w of winners) {
    if (!byUser.has(w.userId)) {
      byUser.set(w.userId, {
        userId: w.userId,
        name: w.user.name,
        avatarUrl: w.user.avatarUrl,
        wins: [],
        totalWins: 0,
      });
    }

    const entry = byUser.get(w.userId)!;
    entry.wins.push({
      roundId: w.roundId,
      roundName: w.round.name,
      roundNumber: w.round.number,
      userId: w.userId,
      name: w.user.name,
      avatarUrl: w.user.avatarUrl,
      favoriteTeam: w.favoriteTeam ?? w.user.favoriteTeam ?? null,
      roundPoints: w.roundPoints,
    });
    entry.totalWins++;
  }

  return Array.from(byUser.values()).sort((a, b) => b.totalWins - a.totalWins);
}
