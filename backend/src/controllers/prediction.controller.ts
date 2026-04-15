// ============================================================
// Na Gaveta — Controller de Palpites v2
// POST /api/predictions             → criar ou atualizar palpite
// GET  /api/predictions/me          → meus palpites
// GET  /api/predictions/pool/:poolId → palpites de um bolão
//
// REGRA CRÍTICA: palpites são bloqueados se:
//   1. matchDate <= agora (partida já iniciou pelo horário)
//   2. status === 'LIVE' (ao vivo)
//   3. status === 'FINISHED' (encerrada)
// Esta validação existe no backend independentemente do frontend.
// ============================================================

import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

// ── Helper: verificar se palpite ainda está aberto ───────────
// REGRA: palpites fecham 10 MINUTOS antes do horário oficial da partida
const LOCK_MINUTES_BEFORE = 10;

function isPredictionOpen(matchDate: Date, status: string): { open: boolean; reason?: string } {
  const now = new Date();

  if (status === 'FINISHED') {
    return { open: false, reason: 'Esta partida já foi encerrada.' };
  }

  if (status === 'LIVE') {
    return { open: false, reason: 'Esta partida já está ao vivo. Palpites encerrados.' };
  }

  if (status === 'CANCELLED') {
    return { open: false, reason: 'Esta partida foi cancelada.' };
  }

  // Bloquear LOCK_MINUTES_BEFORE minutos antes do kickoff
  const lockTime = new Date(matchDate.getTime() - LOCK_MINUTES_BEFORE * 60 * 1000);
  if (lockTime <= now) {
    const matchTimeStr = matchDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return {
      open: false,
      reason: `Palpites encerrados. A partida começa às ${matchTimeStr} e o prazo era ${LOCK_MINUTES_BEFORE} minutos antes.`,
    };
  }

  return { open: true };
}

// ── POST /api/predictions — Criar ou atualizar palpite ───────
export async function upsertPrediction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { matchId, poolId, homeScoreTip, awayScoreTip, isJoker = false } = req.body;

    // Validar campos obrigatórios
    if (!matchId || !poolId || homeScoreTip === undefined || awayScoreTip === undefined) {
      res.status(400).json({ error: 'matchId, poolId, homeScoreTip e awayScoreTip são obrigatórios' });
      return;
    }

    // Validar que os placares são inteiros não-negativos
    const home = parseInt(String(homeScoreTip), 10);
    const away = parseInt(String(awayScoreTip), 10);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      res.status(400).json({ error: 'Placares devem ser números inteiros não-negativos' });
      return;
    }

    // Verificar se a partida existe
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, matchDate: true, status: true, homeTeam: true, awayTeam: true },
    });

    if (!match) {
      res.status(404).json({ error: 'Partida não encontrada' });
      return;
    }

    // VALIDAÇÃO CRÍTICA: verificar se o palpite ainda está aberto
    const { open, reason } = isPredictionOpen(match.matchDate, match.status);
    if (!open) {
      res.status(400).json({ error: reason });
      return;
    }

    // Verificar se o usuário é membro do bolão
    const membership = await prisma.poolMember.findUnique({
      where: { userId_poolId: { userId, poolId } },
    });

    if (!membership) {
      res.status(403).json({ error: 'Você precisa participar do bolão para palpitar' });
      return;
    }

    // Verificar se o bolão existe e está ativo
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
    });

    if (!pool || !pool.isActive) {
      res.status(400).json({ error: 'Este bolão não está mais ativo' });
      return;
    }

    // Criar ou atualizar palpite (upsert)
    // Se marcou como coringa, remover coringa de outros jogos da mesma rodada
    if (isJoker) {
      const matchWithRound = await prisma.match.findUnique({
        where: { id: matchId },
        select: { roundId: true },
      });

      if (matchWithRound?.roundId) {
        const matchesInRound = await prisma.match.findMany({
          where: { roundId: matchWithRound.roundId },
          select: { id: true },
        });

        const matchIds = matchesInRound.map(m => m.id);

        await prisma.prediction.updateMany({
          where: {
            userId,
            poolId,
            matchId: { in: matchIds },
            isJoker: true,
          },
          data: { isJoker: false },
        });
      }
    }

    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId_poolId: { userId, matchId, poolId } },
      create: {
        userId,
        matchId,
        poolId,
        homeScoreTip: home,
        awayScoreTip: away,
        isJoker: Boolean(isJoker),
      },
      update: {
        homeScoreTip: home,
        awayScoreTip: away,
        isJoker: Boolean(isJoker),
        // Limpar pontuação ao editar (será recalculada quando o resultado sair)
        points: 0,
        scoredAt: null,
      },
      include: {
        match: {
          select: {
            homeTeam: true,
            awayTeam: true,
            matchDate: true,
            round: { select: { name: true } },
          },
        },
      },
    });

    res.status(201).json({
      message: 'Palpite salvo com sucesso!',
      prediction,
    });
  } catch (err) {
    console.error('[Prediction] Erro ao salvar palpite:', err);
    res.status(500).json({ error: 'Erro ao salvar palpite' });
  }
}

// ── GET /api/predictions/me — Meus palpites ──────────────────
export async function myPredictions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { poolId } = req.query;

    const predictions = await prisma.prediction.findMany({
      where: {
        userId,
        ...(poolId ? { poolId: String(poolId) } : {}),
      },
      include: {
        match: {
          include: {
            round: {
              include: {
                championship: { select: { id: true, name: true } },
              },
            },
          },
        },
        pool: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ predictions });
  } catch (err) {
    console.error('[Prediction] Erro ao buscar palpites:', err);
    res.status(500).json({ error: 'Erro ao buscar palpites' });
  }
}

// ── GET /api/predictions/pool/:poolId — Palpites de um bolão ─
export async function poolPredictions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { poolId } = req.params;

    const predictions = await prisma.prediction.findMany({
      where: { poolId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        match: {
          select: {
            homeTeam: true,
            awayTeam: true,
            homeScore: true,
            awayScore: true,
            status: true,
            matchDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ predictions });
  } catch (err) {
    console.error('[Prediction] Erro ao buscar palpites do bolão:', err);
    res.status(500).json({ error: 'Erro ao buscar palpites' });
  }
}

// ── GET /api/predictions/match/:matchId/pool/:poolId — Palpites por jogo ─
// Disponível apenas após o fechamento dos palpites (10 min antes do jogo)
export async function matchPredictions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { matchId, poolId } = req.params;

    // Verificar se a partida existe
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, matchDate: true, status: true, homeTeam: true, awayTeam: true },
    });

    if (!match) {
      res.status(404).json({ error: 'Partida não encontrada' });
      return;
    }

    // Só revelar palpites após o fechamento (10 min antes do jogo)
    const lockTime = new Date(match.matchDate.getTime() - LOCK_MINUTES_BEFORE * 60 * 1000);
    const now = new Date();
    if (lockTime > now && match.status === 'SCHEDULED') {
      const minutesLeft = Math.ceil((lockTime.getTime() - now.getTime()) / 60000);
      res.status(403).json({
        error: `Os palpites serão revelados em ${minutesLeft} minuto(s), quando os palpites fecharem.`,
        minutesUntilReveal: minutesLeft,
      });
      return;
    }

    // Verificar se o usuário é membro do bolão
    const userId = req.user?.userId;
    if (userId) {
      const membership = await prisma.poolMember.findUnique({
        where: { userId_poolId: { userId, poolId } },
      });
      if (!membership) {
        res.status(403).json({ error: 'Você precisa participar do bolão para ver os palpites' });
        return;
      }
    }

    const predictions = await prisma.prediction.findMany({
      where: { matchId, poolId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      matchId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      predictions: predictions.map((p) => ({
        userId: p.user.id,
        userName: p.user.name,
        avatarUrl: p.user.avatarUrl,
        homeScoreTip: p.homeScoreTip,
        awayScoreTip: p.awayScoreTip,
        points: p.points,
        scoredAt: p.scoredAt,
      })),
    });
  } catch (err) {
    console.error('[Prediction] Erro ao buscar palpites do jogo:', err);
    res.status(500).json({ error: 'Erro ao buscar palpites' });
  }
}
