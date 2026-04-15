// ============================================================
// Na Gaveta — Controller de Partidas
// GET  /api/matches                  → listar partidas (com filtros)
// GET  /api/pools/:id/matches        → partidas do campeonato do bolão
// PATCH /api/matches/:id/result      → registrar resultado + recalcular pontuações
// PATCH /api/matches/:id/joker       → marcar/desmarcar como coringa
// ============================================================

import { Request, Response } from 'express';
import { MatchStatus } from '@prisma/client';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { recalculatePredictionsForMatch } from '../services/scoring.service';

// ── GET /api/matches ─────────────────────────────────────────
// Lista partidas com filtros opcionais por campeonato/rodada/status
export async function listMatches(req: Request, res: Response): Promise<void> {
  try {
    const { roundId, championshipId, status } = req.query;

    const matches = await prisma.match.findMany({
      where: {
        ...(roundId ? { roundId: String(roundId) } : {}),
        ...(status ? { status: String(status) as MatchStatus } : {}),
        ...(championshipId
          ? { round: { championshipId: String(championshipId) } }
          : {}),
      },
      include: {
        round: {
          include: {
            championship: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { matchDate: 'asc' },
      take: 50,
    });

    res.json({ matches });
  } catch (err) {
    console.error('[Match] Erro ao listar partidas:', err);
    res.status(500).json({ error: 'Erro ao buscar partidas' });
  }
}

// ── GET /api/pools/:id/matches ───────────────────────────────
// Partidas do campeonato de um bolão, com palpite do usuário logado
export async function getPoolMatches(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: poolId } = req.params;
    const userId = req.user?.userId;
    console.log('[MATCH ROUTE]', { user: req.user, userId, poolId });
    console.log('[MATCH ROUTE]', { user: req.user, userId, poolId });

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: { championshipId: true },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado' });
      return;
    }


    const rounds = await prisma.round.findMany({
      where: { championshipId: pool.championshipId },
      include: {
        matches: {
          include: {
            predictions: userId
              ? {
                  where: { userId, poolId },
                  select: {
                    id: true,
                    homeScoreTip: true,
                    awayScoreTip: true,
                    isJoker: true,
                    points: true,
                    scoredAt: true,
                    createdAt: true,
                  },
                }
              : false,
          },
          orderBy: { matchDate: 'asc' },
        },
      },
      orderBy: { number: 'asc' },
    });

    // Achatar palpite do usuário em cada partida
    const roundsFormatted = rounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) => {
        const { predictions, ...matchData } = match as typeof match & {
          predictions?: Array<{
            id: string;
            homeScoreTip: number;
            awayScoreTip: number;
            isJoker: boolean;
            points: number;
            scoredAt: Date | null;
            createdAt: Date;
          }>;
        };
        return {
          ...matchData,
          myPrediction: predictions && predictions.length > 0 ? predictions[0] : null,
        };
      }),
    }));

    res.json({ rounds: roundsFormatted });
  } catch (err) {
    console.error('[Match] Erro ao buscar partidas do bolão:', err);
    res.status(500).json({ error: 'Erro ao buscar partidas' });
  }
}

// ── PATCH /api/matches/:id/result ────────────────────────────
// Registra o resultado real de uma partida.
// Se status = FINISHED, dispara o motor de pontuação automaticamente.
// Body: { homeScore: number, awayScore: number, status?: MatchStatus }
export async function setMatchResult(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { homeScore, awayScore, status } = req.body;

    // Validações
    if (homeScore === undefined || awayScore === undefined) {
      res.status(400).json({ error: 'homeScore e awayScore são obrigatórios.' });
      return;
    }
    if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
      res.status(400).json({ error: 'homeScore e awayScore devem ser números.' });
      return;
    }
    if (homeScore < 0 || awayScore < 0) {
      res.status(400).json({ error: 'Placar não pode ser negativo.' });
      return;
    }

    const validStatuses = Object.values(MatchStatus);
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: `Status inválido. Use: ${validStatuses.join(', ')}` });
      return;
    }

    const existingMatch = await prisma.match.findUnique({ where: { id } });
    if (!existingMatch) {
      res.status(404).json({ error: 'Partida não encontrada.' });
      return;
    }

    // Atualizar a partida
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        homeScore,
        awayScore,
        status: (status as MatchStatus) ?? MatchStatus.FINISHED,
      },
      include: {
        round: {
          include: { championship: { select: { name: true } } },
        },
      },
    });

    // Disparar motor de pontuação se a partida foi finalizada
    if (updatedMatch.status === MatchStatus.FINISHED) {
      await recalculatePredictionsForMatch(id);

      const predictionsCount = await prisma.prediction.count({
        where: { matchId: id, scoredAt: { not: null } },
      });

      res.json({
        message: `Resultado registrado. ${predictionsCount} palpite(s) pontuado(s).`,
        match: updatedMatch,
        predictionsScored: predictionsCount,
      });
      return;
    }

    res.json({ message: 'Resultado atualizado.', match: updatedMatch });
  } catch (err) {
    console.error('[Match] Erro ao registrar resultado:', err);
    res.status(500).json({ error: 'Erro ao registrar resultado da partida.' });
  }
}

// ── PATCH /api/matches/:id/joker ─────────────────────────────
// Marca/desmarca uma partida como coringa (aplica jokerMultiplier)
// Body: { isJoker: boolean }
export async function toggleJoker(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { isJoker } = req.body;

    if (typeof isJoker !== 'boolean') {
      res.status(400).json({ error: 'isJoker deve ser true ou false.' });
      return;
    }

    const match = await prisma.match.update({
      where: { id },
      data: { isJoker },
    });

    res.json({
      message: `Partida ${isJoker ? 'marcada como coringa ⚡' : 'coringa removido'}.`,
      match,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar partida.' });
  }
}
