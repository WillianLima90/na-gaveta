// ============================================================
// Na Gaveta — Scoring Service v1
// Engine de cálculo de pontuação isolada e expansível.
// Toda lógica de pontuação passa por aqui — nunca nos controllers.
// ============================================================

import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';

// ── Tipos internos ────────────────────────────────────────────

export interface ScoreInput {
  prediction: {
    homeScoreTip: number;
    awayScoreTip: number;
    isJoker?: boolean;
  };
  match: {
    homeScore: number;
    awayScore: number;
    isJoker: boolean;
  };
  round: {
    isBonusRound: boolean;
  };
  rule: {
    pointsForOutcome: number;
    pointsForHomeGoals: number;
    pointsForAwayGoals: number;
    exactScoreBonus: number;
    jokerMultiplier: number;
    bonusRoundMultiplier: number;
  };
}

export interface ScoreBreakdown {
  points: number;
  heartTeamPoints: number;
  outcomePoints: number;
  homeGoalPoints: number;
  awayGoalPoints: number;
  exactScoreBonus: number;
  basePoints: number;
  jokerApplied: boolean;
  bonusRoundApplied: boolean;
  multiplierApplied: number;
}

// ── Função pura de cálculo (facilita testes unitários futuros) ─

/**
 * Determina o resultado de uma partida: 'home' | 'away' | 'draw'
 */
function getOutcome(home: number, away: number): 'home' | 'away' | 'draw' {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

/**
 * Calcula a pontuação de um único palpite com base na regra do bolão.
 * Retorna o total de pontos e o breakdown detalhado para auditoria.
 */
export function calculateScore(input: ScoreInput): ScoreBreakdown {
  const { prediction, match, round, rule } = input;

  let outcomePoints = 0;
  let homeGoalPoints = 0;
  let awayGoalPoints = 0;
  let exactBonus = 0;

  const predictedOutcome = getOutcome(prediction.homeScoreTip, prediction.awayScoreTip);
  const actualOutcome = getOutcome(match.homeScore, match.awayScore);

  // 1. Acertou o resultado (V/E/D)?
  if (predictedOutcome === actualOutcome) {
    outcomePoints = rule.pointsForOutcome;
  }

  // 2. Acertou os gols do mandante?
  if (prediction.homeScoreTip === match.homeScore) {
    homeGoalPoints = rule.pointsForHomeGoals;
  }

  // 3. Acertou os gols do visitante?
  if (prediction.awayScoreTip === match.awayScore) {
    awayGoalPoints = rule.pointsForAwayGoals;
  }

  // 4. Acertou o placar exato? (bônus adicional)
  const isExactScore =
    prediction.homeScoreTip === match.homeScore &&
    prediction.awayScoreTip === match.awayScore;

  if (isExactScore) {
    exactBonus = rule.exactScoreBonus;
  }

  // Base antes dos multiplicadores
  const basePoints = outcomePoints + homeGoalPoints + awayGoalPoints + exactBonus;

  // 5. Aplicar multiplicadores (acumulativos)
  let multiplier = 1;
  const jokerApplied = Boolean(prediction.isJoker) && basePoints > 0;
  const bonusRoundApplied = round.isBonusRound && basePoints > 0;

  if (jokerApplied) multiplier *= rule.jokerMultiplier;
  if (bonusRoundApplied) multiplier *= rule.bonusRoundMultiplier;

  const totalPoints = Math.round(basePoints * multiplier);

  // Time do Coração considera somente a pontuação base da partida.
  // Coringa e Rodada Bônus continuam valendo no ranking geral,
  // mas não aumentam a pontuação específica do Time do Coração.
  const heartTeamPoints = basePoints;

  return {
    points: totalPoints,
    heartTeamPoints,
    outcomePoints,
    homeGoalPoints,
    awayGoalPoints,
    exactScoreBonus: exactBonus,
    basePoints,
    jokerApplied,
    bonusRoundApplied,
    multiplierApplied: multiplier,
  };
}

// ── Função principal: recalcular todos os palpites de uma partida ─

/**
 * Recalcula a pontuação de todos os palpites de uma partida finalizada.
 * Atualiza Prediction.points, Prediction.scoredAt e PoolMember.score.
 * Deve ser chamada sempre que uma partida for marcada como FINISHED.
 */
export async function recalculatePredictionsForMatch(
  matchId: string,
  transactionClient?: Prisma.TransactionClient
): Promise<void> {
  const executeRecalculation = async (tx: Prisma.TransactionClient) => {
    // Buscar a partida já dentro da transação.
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { round: true },
    });

    if (!match || match.homeScore === null || match.awayScore === null) {
      throw new Error('Partida não encontrada ou sem resultado registrado.');
    }

    // Carregar todos os dados necessários em uma única consulta.
    const predictions = await tx.prediction.findMany({
      where: { matchId },
      include: {
        pool: {
          select: {
            bonusRoundId: true,
            scoreRule: true,
          },
        },
      },
    });

    if (predictions.length === 0) return;

    // Buscar todos os membros afetados de uma só vez.
    const memberKeys = Array.from(
      new Map(
        predictions.map((prediction) => [
          `${prediction.userId}:${prediction.poolId}`,
          {
            userId: prediction.userId,
            poolId: prediction.poolId,
          },
        ])
      ).values()
    );

    const members = await tx.poolMember.findMany({
      where: {
        OR: memberKeys,
      },
      select: {
        id: true,
        userId: true,
        poolId: true,
        favoriteTeam: true,
      },
    });

    const memberByUserAndPool = new Map(
      members.map((member) => [
        `${member.userId}:${member.poolId}`,
        member,
      ])
    );

    const scoredAt = new Date();

    for (const prediction of predictions) {
      const scoreRule = prediction.pool.scoreRule ?? {
        pointsForOutcome: 10,
        pointsForHomeGoals: 5,
        pointsForAwayGoals: 5,
        exactScoreBonus: 0,
        jokerMultiplier: 2,
        bonusRoundMultiplier: 2,
      };

      const breakdown = calculateScore({
        prediction: {
          homeScoreTip: prediction.homeScoreTip,
          awayScoreTip: prediction.awayScoreTip,
          isJoker: prediction.isJoker,
        },
        match: {
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          isJoker: match.isJoker,
        },
        round: {
          isBonusRound: prediction.pool.bonusRoundId === match.round.id,
        },
        rule: scoreRule,
      });

      const member = memberByUserAndPool.get(
        `${prediction.userId}:${prediction.poolId}`
      );

      const isHeartMatch =
        Boolean(member?.favoriteTeam) &&
        (
          match.homeTeam === member?.favoriteTeam ||
          match.awayTeam === member?.favoriteTeam
        );

      const newHeartTeamPoints = isHeartMatch
        ? breakdown.heartTeamPoints
        : 0;

      const oldPoints = prediction.points ?? 0;
      const oldHeartTeamPoints = prediction.heartTeamPoints ?? 0;
      const pointsDiff = breakdown.points - oldPoints;
      const heartTeamPointsDiff =
        newHeartTeamPoints - oldHeartTeamPoints;

      await tx.prediction.update({
        where: { id: prediction.id },
        data: {
          points: breakdown.points,
          heartTeamPoints: newHeartTeamPoints,
          scoredAt,
        },
      });

      if (!member) continue;

      if (pointsDiff === 0 && heartTeamPointsDiff === 0) {
        continue;
      }

      await tx.poolMember.update({
        where: { id: member.id },
        data: {
          ...(pointsDiff !== 0
            ? { score: { increment: pointsDiff } }
            : {}),
          ...(heartTeamPointsDiff !== 0
            ? {
                heartTeamScore: {
                  increment: heartTeamPointsDiff,
                },
              }
            : {}),
        },
      });
    }
  };

  if (transactionClient) {
    await executeRecalculation(transactionClient);
    return;
  }

  await prisma.$transaction(executeRecalculation);
}
