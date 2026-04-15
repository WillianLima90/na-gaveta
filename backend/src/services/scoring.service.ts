// ============================================================
// Na Gaveta — Scoring Service v1
// Engine de cálculo de pontuação isolada e expansível.
// Toda lógica de pontuação passa por aqui — nunca nos controllers.
// ============================================================

import { PrismaClient, Prediction, Match, ScoreRule, Round } from '@prisma/client';

const prisma = new PrismaClient();

// ── Tipos internos ────────────────────────────────────────────

export interface ScoreInput {
  prediction: {
    homeScoreTip: number;
    awayScoreTip: number;
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
  const jokerApplied = match.isJoker && basePoints > 0;
  const bonusRoundApplied = round.isBonusRound && basePoints > 0;

  if (jokerApplied) multiplier *= rule.jokerMultiplier;
  if (bonusRoundApplied) multiplier *= rule.bonusRoundMultiplier;

  const totalPoints = Math.round(basePoints * multiplier);

  return {
    points: totalPoints,
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
export async function recalculatePredictionsForMatch(matchId: string): Promise<void> {
  // Buscar a partida com a rodada
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { round: true },
  });

  if (!match || match.homeScore === null || match.awayScore === null) {
    throw new Error('Partida não encontrada ou sem resultado registrado.');
  }

  // Buscar todos os palpites desta partida com a regra do bolão
  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: {
      pool: {
        include: { scoreRule: true },
      },
    },
  });

  if (predictions.length === 0) return;

  // Calcular e atualizar cada palpite
  for (const prediction of predictions) {
    const rule = prediction.pool.scoreRule;

    // Se o bolão não tem regra, usar defaults
    const scoreRule = rule ?? {
      pointsForOutcome: 10,
      pointsForHomeGoals: 5,
      pointsForAwayGoals: 5,
      exactScoreBonus: 0,
      jokerMultiplier: 2,
      bonusRoundMultiplier: 2,
    };

    const pool = await prisma.pool.findUnique({
      where: { id: prediction.poolId },
      select: { bonusRoundId: true },
    });

    const breakdown = calculateScore({
      prediction: {
        homeScoreTip: prediction.homeScoreTip,
        awayScoreTip: prediction.awayScoreTip,
      },
      match: {
        homeScore: match.homeScore as number,
        awayScore: match.awayScore as number,
        isJoker: match.isJoker,
      },
      round: {
        isBonusRound: pool?.bonusRoundId === match.round.id,
      },
      rule: scoreRule,
    });

    // Atualizar o palpite com os pontos calculados
    await prisma.prediction.update({
      where: { id: prediction.id },
      data: {
        points: breakdown.points,
        scoredAt: new Date(),
      },
    });

    // Atualizar o score acumulado do membro no bolão
    // Primeiro, buscar o score atual para recalcular corretamente
    const member = await prisma.poolMember.findUnique({
      where: {
        userId_poolId: {
          userId: prediction.userId,
          poolId: prediction.poolId,
        },
      },
    });

    if (member) {
      // Subtrair pontos antigos e adicionar os novos (para suportar recálculo)
      const oldPoints = prediction.points ?? 0;
      const pointsDiff = breakdown.points - oldPoints;

      await prisma.poolMember.update({
        where: { id: member.id },
        data: { score: { increment: pointsDiff } },
      });
    }
  }
}
