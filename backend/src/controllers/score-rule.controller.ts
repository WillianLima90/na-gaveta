// ============================================================
// Na Gaveta — Score Rule Controller
// GET   /api/pools/:id/rules   → ver regras de pontuação do bolão
// PATCH /api/pools/:id/rules   → atualizar regras (apenas dono)
// PATCH /api/rounds/:id/bonus  → marcar/desmarcar rodada como bônus
// ============================================================

import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';

// ── GET /api/pools/:id/rules ─────────────────────────────────
export async function getPoolRules(req: Request, res: Response): Promise<void> {
  try {
    const { id: poolId } = req.params;

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: { scoreRule: true },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    if (!pool.scoreRule) {
      res.status(404).json({ error: 'Este bolão não possui regras de pontuação configuradas.' });
      return;
    }

    const startedMatch = await prisma.match.findFirst({
      where: {
        round: { championshipId: pool.championshipId },
        OR: [
          { status: 'LIVE' },
          { status: 'FINISHED' },
        ],
      },
      select: { id: true },
    });

    res.json({
      rules: pool.scoreRule,
      locked: Boolean(startedMatch),
    });
  } catch (err) {
    console.error('[ScoreRule] Erro ao buscar regras:', err);
    res.status(500).json({ error: 'Erro ao buscar regras de pontuação.' });
  }
}

// ── PATCH /api/pools/:id/rules ───────────────────────────────
// Atualiza as regras de pontuação do bolão (apenas o dono pode alterar)
// Body: campos parciais da ScoreRule
export async function updatePoolRules(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: poolId } = req.params;
    const userId = req.user?.userId;

    // Verificar se o usuário é dono do bolão
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: { scoreRule: true },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    if (pool.ownerId !== userId) {
      res.status(403).json({ error: 'Apenas o dono do bolão pode alterar as regras.' });
      return;
    }

    const startedMatch = await prisma.match.findFirst({
      where: {
        round: { championshipId: pool.championshipId },
        OR: [
          { status: 'LIVE' },
          { status: 'FINISHED' },
        ],
      },
      select: { id: true },
    });

    if (startedMatch) {
      res.status(400).json({ error: 'As regras do bolão não podem mais ser alteradas após o início do campeonato.' });
      return;
    }

    const {
      pointsForOutcome,
      pointsForHomeGoals,
      pointsForAwayGoals,
      exactScoreBonus,
      jokerMultiplier,
      bonusRoundMultiplier,
    } = req.body;

    // Validar que os valores são números não-negativos
    const numericFields = {
      pointsForOutcome,
      pointsForHomeGoals,
      pointsForAwayGoals,
      exactScoreBonus,
      jokerMultiplier,
      bonusRoundMultiplier,
    };

    for (const [key, value] of Object.entries(numericFields)) {
      if (value !== undefined && (typeof value !== 'number' || value < 0)) {
        res.status(400).json({ error: `${key} deve ser um número não-negativo.` });
        return;
      }
    }

    // Upsert: criar ou atualizar a regra
    const updatedRule = await prisma.scoreRule.upsert({
      where: { poolId },
      create: {
        poolId,
        pointsForOutcome: pointsForOutcome ?? 10,
        pointsForHomeGoals: pointsForHomeGoals ?? 5,
        pointsForAwayGoals: pointsForAwayGoals ?? 5,
        exactScoreBonus: exactScoreBonus ?? 0,
        jokerMultiplier: jokerMultiplier ?? 2,
        bonusRoundMultiplier: bonusRoundMultiplier ?? 2,
      },
      update: {
        ...(pointsForOutcome !== undefined && { pointsForOutcome }),
        ...(pointsForHomeGoals !== undefined && { pointsForHomeGoals }),
        ...(pointsForAwayGoals !== undefined && { pointsForAwayGoals }),
        ...(exactScoreBonus !== undefined && { exactScoreBonus }),
        ...(jokerMultiplier !== undefined && { jokerMultiplier }),
        ...(bonusRoundMultiplier !== undefined && { bonusRoundMultiplier }),
      },
    });

    res.json({
      message: 'Regras de pontuação atualizadas.',
      rules: updatedRule,
    });
  } catch (err) {
    console.error('[ScoreRule] Erro ao atualizar regras:', err);
    res.status(500).json({ error: 'Erro ao atualizar regras de pontuação.' });
  }
}

// ── PATCH /api/rounds/:id/bonus ──────────────────────────────
// Marca/desmarca a rodada bônus de um bolão específico
// Body: { isBonusRound: boolean, poolId: string }
export async function toggleBonusRound(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { isBonusRound, poolId } = req.body;

    if (typeof isBonusRound !== 'boolean') {
      res.status(400).json({ error: 'isBonusRound deve ser true ou false.' });
      return;
    }

    if (!poolId || typeof poolId !== 'string') {
      res.status(400).json({ error: 'poolId é obrigatório.' });
      return;
    }

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: {
        id: true,
        championshipId: true,
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    const roundData = await prisma.round.findFirst({
      where: { id, championshipId: pool.championshipId },
      select: { id: true, number: true },
    });

    if (!roundData) {
      res.status(404).json({ error: 'Rodada não encontrada neste bolão.' });
      return;
    }

    const startedMatch = await prisma.match.findFirst({
      where: {
        round: { championshipId: pool.championshipId },
        OR: [
          { status: 'LIVE' },
          { status: 'FINISHED' },
        ],
      },
      select: { id: true },
    });

    if (startedMatch) {
      res.status(400).json({ error: 'A rodada bônus não pode mais ser alterada após o início do campeonato.' });
      return;
    }

    await prisma.pool.update({
      where: { id: poolId },
      data: { bonusRoundId: isBonusRound ? roundData.id : null },
    });

    res.json({
      message: `Rodada ${isBonusRound ? 'marcada como bônus 🌟' : 'bônus removido'}.`,
      roundId: roundData.id,
      roundNumber: roundData.number,
      isBonusRound,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar rodada.' });
  }
}
