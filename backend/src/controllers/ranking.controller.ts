// ============================================================
// Na Gaveta — Ranking Controller v2
// Usa statistics.service para cálculo isolado e desempate.
//
// GET /api/pools/:id/ranking                    → ranking geral
// GET /api/pools/:id/rounds/:roundId/ranking    → ranking da rodada
// GET /api/pools/:id/rounds/:roundId/highlights → destaques da rodada
// GET /api/pools/:id/users/:userId/history      → histórico do usuário
// ============================================================

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';
import {
  getMemberStats,
  getRoundRanking,
  getRoundHighlights,
  getUserPoolHistory,
} from '../services/statistics.service';

// ── GET /api/pools/:id/ranking ───────────────────────────────
// Ranking geral com desempate em 4 critérios.
export async function getPoolRanking(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: poolId } = req.params;
    const currentUserId = req.user?.userId;

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: { id: true, name: true },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    const ranking = await getMemberStats(poolId, currentUserId);

    res.json({
      poolId,
      poolName: pool.name,
      ranking,
      totalMembers: ranking.length,
    });
  } catch (err) {
    console.error('[Ranking] Erro ao buscar ranking:', err);
    res.status(500).json({ error: 'Erro ao buscar ranking do bolão.' });
  }
}

// ── GET /api/pools/:id/rounds/:roundId/ranking ───────────────
// Ranking de uma rodada específica com desempate.
export async function getRoundRankingHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: poolId, roundId } = req.params;
    const currentUserId = req.user?.userId;

    // Verificar se a rodada pertence ao campeonato do bolão
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: {
        championshipId: true,
        bonusRoundId: true,
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    const round = await prisma.round.findFirst({
      where: { id: roundId, championshipId: pool.championshipId },
      select: { id: true, name: true, number: true },
    });

    if (!round) {
      res.status(404).json({ error: 'Rodada não encontrada neste bolão.' });
      return;
    }

    const ranking = await getRoundRanking(poolId, roundId, currentUserId);

    res.json({
      poolId,
      roundId,
      roundName: round.name,
      roundNumber: round.number,
      isBonusRound: pool.bonusRoundId === round.id,
      ranking,
    });
  } catch (err) {
    console.error('[Ranking] Erro ao buscar ranking da rodada:', err);
    res.status(500).json({ error: 'Erro ao buscar ranking da rodada.' });
  }
}

// ── GET /api/pools/:id/rounds/:roundId/highlights ────────────
// Destaques da rodada: melhor usuário, maior pontuação, totais.
export async function getRoundHighlightsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: poolId, roundId } = req.params;

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: { id: true, championshipId: true },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    const round = await prisma.round.findFirst({
      where: { id: roundId, championshipId: pool.championshipId },
    });

    if (!round) {
      res.status(404).json({ error: 'Rodada não encontrada neste bolão.' });
      return;
    }

    const highlights = await getRoundHighlights(poolId, roundId);

    res.json({ highlights });
  } catch (err) {
    console.error('[Ranking] Erro ao buscar destaques da rodada:', err);
    res.status(500).json({ error: 'Erro ao buscar destaques da rodada.' });
  }
}

// ── GET /api/pools/:id/users/:userId/history ─────────────────
// Histórico do usuário no bolão: pontos por rodada e totais.
export async function getUserHistoryHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: poolId, userId } = req.params;
    const requesterId = req.user?.userId;

    // Apenas o próprio usuário ou o dono do bolão podem ver o histórico
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: { id: true, ownerId: true },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    if (requesterId !== userId && requesterId !== pool.ownerId) {
      res.status(403).json({ error: 'Acesso negado.' });
      return;
    }

    const history = await getUserPoolHistory(poolId, userId);

    res.json({ history });
  } catch (err) {
    console.error('[Ranking] Erro ao buscar histórico do usuário:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico do usuário.' });
  }
}

// ── GET /api/pools/:id/users/:userId/summary ─────────────────
// Summary de engajamento: posição, rival, streak, melhor rodada, pendentes.
export async function getUserSummaryHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: poolId, userId } = req.params;

    const { getUserSummary } = await import('../services/statistics.service');
    const summary = await getUserSummary(poolId, userId);

    res.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar summary.';
    if (message.includes('não encontrado') || message.includes('não é membro')) {
      res.status(404).json({ error: message });
      return;
    }
    console.error('[Summary] Erro:', err);
    res.status(500).json({ error: 'Erro ao buscar summary do usuário.' });
  }
}

// ── GET /api/pools/:id/round-winners ─────────────────────────
// Busca os vencedores de rodada agrupados por usuário.
// Dados prontos para renderização de escudos no frontend.
export async function getPoolRoundWinnersHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: poolId } = req.params;

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: { id: true },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    const { getPoolRoundWinners } = await import('../services/statistics.service');
    const winners = await getPoolRoundWinners(poolId);

    res.json({ poolId, winners });
  } catch (err) {
    console.error('[RoundWinners] Erro ao buscar vencedores:', err);
    res.status(500).json({ error: 'Erro ao buscar vencedores de rodada.' });
  }
}

// ── POST /api/pools/:id/round-winners/compute ────────────────
// Calcula e persiste os vencedores de todas as rodadas encerradas.
// Apenas o dono do bolão pode chamar este endpoint.
export async function computeRoundWinnersHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: poolId } = req.params;
    const requesterId = req.user?.userId;

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: { id: true, ownerId: true },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    if (requesterId !== pool.ownerId) {
      res.status(403).json({ error: 'Apenas o dono do bolão pode computar vencedores.' });
      return;
    }

    const { computeAndSaveRoundWinners } = await import('../services/statistics.service');
    await computeAndSaveRoundWinners(poolId);

    const { getPoolRoundWinners } = await import('../services/statistics.service');
    const winners = await getPoolRoundWinners(poolId);

    res.json({ message: 'Vencedores calculados com sucesso.', poolId, winners });
  } catch (err) {
    console.error('[RoundWinners] Erro ao computar vencedores:', err);
    res.status(500).json({ error: 'Erro ao computar vencedores de rodada.' });
  }
}
