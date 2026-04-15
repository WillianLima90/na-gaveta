// ============================================================
// Na Gaveta — Controller de Bolões v2
// ============================================================

import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

// ── Listar bolões públicos ───────────────────────────────────
export async function listPools(req: AuthRequest, res: Response): Promise<void> {
  try {
    const pools = await prisma.pool.findMany({
      where: { isPublic: true },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        championship: { select: { id: true, name: true, logoUrl: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ pools });
  } catch (err) {
    console.error('[Pool] Erro ao listar bolões:', err);
    res.status(500).json({ error: 'Erro ao buscar bolões' });
  }
}

// ── Buscar bolão por ID ──────────────────────────────────────
// Inclui flag isMember se usuário autenticado (optionalAuthenticate)
export async function getPool(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const pool = await prisma.pool.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        championship: { select: { id: true, name: true, slug: true, season: true } },
        scoreRule: true,
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { score: 'desc' },
          take: 10, // top 10 para ranking
        },
        _count: { select: { members: true } },
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado' });
      return;
    }

    // Verificar se o usuário autenticado já é membro
    let isMember = false;
    if (userId) {
      const membership = await prisma.poolMember.findUnique({
        where: { userId_poolId: { userId, poolId: id } },
      });
      isMember = !!membership;

    }

    res.json({ pool: { ...pool, isMember } });
  } catch (err) {
    console.error('[Pool] Erro ao buscar bolão:', err);
    res.status(500).json({ error: 'Erro ao buscar bolão' });
  }
}

// ── Criar novo bolão ─────────────────────────────────────────
export async function createPool(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { name, description, championshipId, isPublic, maxMembers } = req.body;

    if (!name || !championshipId) {
      res.status(400).json({ error: 'Nome e campeonato são obrigatórios' });
      return;
    }

    // Verificar se campeonato existe
    const championship = await prisma.championship.findUnique({
      where: { id: championshipId },
    });
    if (!championship) {
      res.status(404).json({ error: 'Campeonato não encontrado' });
      return;
    }

    // Gerar código único (retry se colisão)
    let code = generateInviteCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.pool.findUnique({ where: { code } });
      if (!existing) break;
      code = generateInviteCode();
      attempts++;
    }

    const pool = await prisma.pool.create({
      data: {
        name,
        description,
        code,
        isPublic: isPublic ?? false,
        maxMembers: maxMembers ? parseInt(maxMembers) : null,
        ownerId: userId,
        championshipId,
        // Criador entra automaticamente como membro
        members: { create: { userId } },
        // Regras padrão do bolão
        scoreRule: {
          create: {
            pointsForOutcome: 10,
            pointsForHomeGoals: 5,
            pointsForAwayGoals: 5,
            exactScoreBonus: 0,
            jokerMultiplier: 2,
            bonusRoundMultiplier: 2,
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true } },
        championship: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    });

    res.status(201).json({ pool });
  } catch (err) {
    console.error('[Pool] Erro ao criar bolão:', err);
    res.status(500).json({ error: 'Erro ao criar bolão' });
  }
}

// ── Entrar em um bolão via código de convite ─────────────────
export async function joinPool(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Código do bolão é obrigatório' });
      return;
    }

    const pool = await prisma.pool.findUnique({ where: { code: code.toUpperCase() } });
    if (!pool) {
      res.status(404).json({ error: 'Código de bolão inválido' });
      return;
    }

    const existing = await prisma.poolMember.findUnique({
      where: { userId_poolId: { userId, poolId: pool.id } },
    });
    if (existing) {
      res.status(409).json({ error: 'Você já participa deste bolão' });
      return;
    }

    await prisma.poolMember.create({ data: { userId, poolId: pool.id } });

    res.status(201).json({
      message: 'Entrou no bolão com sucesso!',
      poolId: pool.id,
      poolName: pool.name,
    });
  } catch (err) {
    console.error('[Pool] Erro ao entrar no bolão:', err);
    res.status(500).json({ error: 'Erro ao entrar no bolão' });
  }
}

// ── Entrar em um bolão diretamente pelo ID ───────────────────
// Usado para bolões públicos (botão "Participar" na tela do bolão)
export async function joinPoolById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: poolId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });
    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado' });
      return;
    }

    if (!pool.isPublic) {
      res.status(403).json({ error: 'Este bolão é privado. Use o código de convite.' });
      return;
    }

    const existing = await prisma.poolMember.findUnique({
      where: { userId_poolId: { userId, poolId } },
    });
    if (existing) {
      res.status(409).json({ error: 'Você já participa deste bolão' });
      return;
    }

    await prisma.poolMember.create({ data: { userId, poolId } });

    res.status(201).json({
      message: 'Entrou no bolão com sucesso!',
      poolId: pool.id,
      poolName: pool.name,
    });
  } catch (err) {
    console.error('[Pool] Erro ao entrar no bolão por ID:', err);
    res.status(500).json({ error: 'Erro ao entrar no bolão' });
  }
}

// ── Bolões do usuário autenticado ────────────────────────────
export async function myPools(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const memberships = await prisma.poolMember.findMany({
      where: { userId },
      include: {
        pool: {
          include: {
            owner: { select: { id: true, name: true } },
            championship: { select: { id: true, name: true, logoUrl: true } },
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const pools = memberships.map((m) => ({
      ...m.pool,
      myScore: m.score,
      joinedAt: m.joinedAt,
    }));

    res.json({ pools });
  } catch (err) {
    console.error('[Pool] Erro ao buscar meus bolões:', err);
    res.status(500).json({ error: 'Erro ao buscar seus bolões' });
  }
}

// ── Helper: gerar código de convite ─────────────────────────
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

// ── Sortear rodada bônus ───────────────────────────────────
export async function drawBonusRound(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: poolId } = req.params;
    const userId = req.user?.userId;

    // Buscar rodadas do campeonato
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        championship: {
          include: {
            rounds: true,
          },
        },
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado' });
      return;
    }

    const rounds = pool.championship.rounds;

    if (!rounds || rounds.length === 0) {
      res.status(400).json({ error: 'Nenhuma rodada encontrada' });
      return;
    }

    // Verificar se já existe rodada bônus
    if (!userId || pool.ownerId !== userId) {
      res.status(403).json({ error: 'Apenas o dono do bolão pode sortear a rodada bônus' });
      return;
    }

    if (pool.bonusRoundId) {
      res.status(400).json({ error: 'Rodada bônus já foi sorteada' });
      return;
    }

    // TEMP: trava de início do campeonato desligada para testar a roleta
    // const now = new Date();
    // const hasStarted = rounds.some((r) => new Date(r.startDate) <= now);

    // if (hasStarted) {
    //   res.status(400).json({ error: 'Não é possível sortear rodada bônus após início do campeonato' });
    //   return;
    // }

    const requestedRoundId = typeof req.body?.roundId === 'string' ? req.body.roundId : null;

    const availableRounds = rounds.filter((r) => new Date(r.startDate) > new Date());

    if (availableRounds.length === 0) {
      res.status(400).json({ error: 'Não há rodadas futuras disponíveis para sorteio' });
      return;
    }

    let selectedRound;
    if (requestedRoundId) {
      selectedRound = availableRounds.find((r) => r.id === requestedRoundId);
      if (!selectedRound) {
        res.status(400).json({ error: 'Rodada escolhida é inválida para este campeonato' });
        return;
      }
    } else {
      const randomIndex = Math.floor(Math.random() * availableRounds.length);
      selectedRound = availableRounds[randomIndex];
    }

    await prisma.pool.update({
      where: { id: poolId },
      data: { bonusRoundId: selectedRound.id },
    });

    res.json({
      message: 'Rodada bônus sorteada com sucesso',
      roundId: selectedRound.id,
      roundNumber: selectedRound.number,
    });

  } catch (err) {
    console.error('[Pool] Erro ao sortear rodada bônus:', err);
    res.status(500).json({ error: 'Erro ao sortear rodada bônus' });
  }
}
