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
      where: { isPublic: true, isActive: true },
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
    let membershipStatus: string | null = null;
    let myFavoriteTeam: string | null = null;
    let canEditFavoriteTeam = false;

    if (userId) {
      const membership = await prisma.poolMember.findUnique({
        where: { userId_poolId: { userId, poolId: id } },
      });

      isMember = membership?.status === "APPROVED";
      membershipStatus = membership?.status ?? null;
      myFavoriteTeam = membership?.favoriteTeam ?? null;

      if (membership?.status === "APPROVED") {
        const nextRound = await prisma.round.findFirst({
          where: {
            championshipId: pool.championshipId,
            matches: {
              some: {
                matchDate: { gt: membership.joinedAt }
              }
            }
          },
          orderBy: { number: 'asc' },
          include: {
            matches: {
              where: {
                matchDate: { gt: membership.joinedAt }
              },
              orderBy: { matchDate: 'asc' },
              take: 1
            }
          }
        });

        const firstMatch = nextRound?.matches?.[0];

        if (firstMatch) {
          const now = new Date();
          const lockTime = new Date(firstMatch.matchDate.getTime() - 10 * 60 * 1000);

          canEditFavoriteTeam = now < lockTime;
        }
      }
    }

    res.json({
      pool: {
        ...pool,
        isMember,
        membershipStatus,
        myFavoriteTeam,
        canEditFavoriteTeam
      }
    });
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

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        plan: true,
        role: true,
      },
    });

    if (!currentUser) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const isPlatformAdmin = currentUser.role === 'ADMIN';

    const poolLimits = {
      FREE: 1,
      PRO: 5,
      BUSINESS: Infinity,
    };

    const maxPoolsAllowed =
      poolLimits[currentUser.plan as keyof typeof poolLimits] ?? 1;

    if (
      !isPlatformAdmin &&
      (await prisma.pool.count({
        where: {
          ownerId: userId,
          isActive: true,
        },
      })) >= maxPoolsAllowed
    ) {
      const limitText =
        maxPoolsAllowed === Infinity
          ? 'ilimitados'
          : maxPoolsAllowed;

      const poolLabel =
        maxPoolsAllowed === 1 ? 'bolão' : 'bolões';

      res.status(403).json({
        error: `Plano ${currentUser.plan} permite criar até ${limitText} ${poolLabel}. Faça upgrade para aumentar seu limite.`,
      });
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

    const startingRound = await prisma.round.findFirst({
      where: {
        championshipId,
        matches: {
          some: {
            status: 'SCHEDULED',
            matchDate: { gt: new Date() }
          }
        }
      },
      orderBy: { number: 'asc' }
    });

    const pool = await prisma.pool.create({
      data: {
        name,
        description,
        code,
        isPublic: isPublic ?? false,
        maxMembers: maxMembers ? parseInt(maxMembers) : null,
        ownerId: userId,
        championshipId,
        startingRoundId: startingRound?.id ?? null,
        // Criador entra automaticamente como membro
        members: { create: { userId, status: "APPROVED" } },
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

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        role: true,
        poolMembers: { where: { status: 'APPROVED', pool: { isActive: true } }, select: { id: true } },
      },
    });

    if (!currentUser) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const isPlatformAdmin = currentUser.role === 'ADMIN';

    const existing = await prisma.poolMember.findUnique({
      where: { userId_poolId: { userId, poolId: pool.id } },
    });
    if (!existing && !isPlatformAdmin && currentUser.plan === 'FREE' && currentUser.poolMembers.length >= 3) {
      res.status(403).json({
        error: 'Plano FREE permite participar de até 3 bolões. Faça upgrade para participar de mais bolões.',
      });
      return;
    }

    if (existing) {
      if (existing.status === 'PENDING') {
        res.status(409).json({ error: 'Você já solicitou entrada neste bolão. Aguarde aprovação.' });
        return;
      }

      if (existing.status === 'APPROVED') {
        res.status(409).json({ error: 'Você já participa deste bolão.' });
        return;
      }

      await prisma.poolMember.update({
        where: { userId_poolId: { userId, poolId: pool.id } },
        data: { status: 'PENDING' },
      });
    } else {
      await prisma.poolMember.create({ data: { userId, poolId: pool.id, status: "PENDING" } });
    }

    res.status(201).json({
      message: 'Solicitação enviada para aprovação do administrador!',
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

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        role: true,
        poolMembers: { where: { status: 'APPROVED', pool: { isActive: true } }, select: { id: true } },
      },
    });

    if (!currentUser) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const isPlatformAdmin = currentUser.role === 'ADMIN';

    const existing = await prisma.poolMember.findUnique({
      where: { userId_poolId: { userId, poolId } },
    });

    if (!existing && !isPlatformAdmin && currentUser.plan === 'FREE' && currentUser.poolMembers.length >= 3) {
      res.status(403).json({
        error: 'Plano FREE permite participar de até 3 bolões. Faça upgrade para participar de mais bolões.',
      });
      return;
    }

    if (existing) {
      if (existing.status === 'PENDING') {
        res.status(409).json({ error: 'Você já solicitou entrada neste bolão. Aguarde aprovação.' });
        return;
      }

      if (existing.status === 'APPROVED') {
        res.status(409).json({ error: 'Você já participa deste bolão.' });
        return;
      }

      await prisma.poolMember.update({
        where: { userId_poolId: { userId, poolId } },
        data: { status: 'PENDING' },
      });
    } else {
      await prisma.poolMember.create({ data: { userId, poolId, status: "PENDING" } });
    }

    res.status(201).json({
      message: 'Solicitação enviada para aprovação do administrador!',
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
      where: {
        userId,
        status: 'APPROVED',
        pool: { isActive: true },
      },
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


// ── PATCH /api/pools/:id/favorite-team ─────────────────────
export async function setFavoriteTeam(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: poolId } = req.params;
    const userId = req.user!.userId;
    const { team } = req.body;

    if (!team) {
      res.status(400).json({ error: 'Time é obrigatório.' });
      return;
    }

    const member = await prisma.poolMember.findUnique({
      where: {
        userId_poolId: {
          userId,
          poolId
        }
      },
      include: {
        pool: true
      }
    });

    if (!member || member.status !== 'APPROVED') {
      res.status(403).json({ error: 'Você precisa estar aprovado no bolão para definir o time do coração.' });
      return;
    }

    const now = new Date();
    const lockMinutesBefore = 10;

    const nextRound = await prisma.round.findFirst({
      where: {
        championshipId: member.pool.championshipId,
        matches: {
          some: {
            status: 'SCHEDULED',
            matchDate: { gt: member.joinedAt }
          }
        }
      },
      orderBy: { number: 'asc' },
      include: {
        matches: {
          where: {
            status: 'SCHEDULED',
            matchDate: { gt: member.joinedAt }
          },
          orderBy: { matchDate: 'asc' },
          take: 1
        }
      }
    });

    const firstMatch = nextRound?.matches?.[0];

    if (!firstMatch) {
      res.status(400).json({ error: 'Não há próxima rodada disponível para definir o time do coração.' });
      return;
    }

    const lockTime = new Date(firstMatch.matchDate.getTime() - lockMinutesBefore * 60 * 1000);

    if (lockTime <= now) {
      res.status(400).json({
        error: 'O prazo para definir o time do coração desta rodada já encerrou.'
      });
      return;
    }

    await prisma.poolMember.update({
      where: { id: member.id },
      data: { favoriteTeam: team }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Pool] Erro ao definir time do coração:', err);
    res.status(500).json({ error: 'Erro ao definir time do coração.' });
  }
}

export async function deletePool(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const pool = await prisma.pool.findUnique({
      where: { id }
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado' });
      return;
    }

    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas ADMIN do site pode deletar bolões' });
      return;
    }

    // Deletar dependências primeiro (ordem importa)
    await prisma.prediction.deleteMany({ where: { poolId: id } });
    await prisma.poolMember.deleteMany({ where: { poolId: id } });
    await prisma.roundWinner?.deleteMany?.({ where: { poolId: id } }).catch(() => {});
    await prisma.scoreRule.deleteMany({ where: { poolId: id } });

    // Agora sim deletar o pool
    await prisma.pool.delete({
      where: { id }
    });

    res.json({ message: 'Bolão deletado com sucesso' });

  } catch (err) {
    console.error('[Pool] Erro ao deletar bolão:', err);
    res.status(500).json({ error: 'Erro ao deletar bolão' });
  }
}

async function assertPoolOwner(poolId: string, userId: string): Promise<boolean> {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    select: { ownerId: true },
  });

  return pool?.ownerId === userId;
}

// ── GET /api/pools/:id/members/pending ─────────────────────
export async function listPendingMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: poolId } = req.params;

    const isOwner = await assertPoolOwner(poolId, userId);
    if (!isOwner) {
      res.status(403).json({ error: 'Apenas o admin do bolão pode ver solicitações pendentes.' });
      return;
    }

    const members = await prisma.poolMember.findMany({
      where: { poolId, status: 'PENDING' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({ members });
  } catch (err) {
    console.error('[Pool] Erro ao listar solicitações pendentes:', err);
    res.status(500).json({ error: 'Erro ao listar solicitações pendentes.' });
  }
}

// ── GET /api/pools/:id/members/approved ────────────────────
export async function listApprovedMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: poolId } = req.params;

    const isOwner = await assertPoolOwner(poolId, userId);
    if (!isOwner) {
      res.status(403).json({ error: 'Apenas o admin do bolão pode ver participantes.' });
      return;
    }

    const members = await prisma.poolMember.findMany({
      where: { poolId, status: 'APPROVED' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({ members });
  } catch (err) {
    console.error('[Pool] Erro ao listar participantes:', err);
    res.status(500).json({ error: 'Erro ao listar participantes.' });
  }
}

// ── PATCH /api/pools/:id/members/:memberId/approve ──────────
export async function approveMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: poolId, memberId } = req.params;

    const isOwner = await assertPoolOwner(poolId, userId);
    if (!isOwner) {
      res.status(403).json({ error: 'Apenas o admin do bolão pode aprovar participantes.' });
      return;
    }

    const pendingMember = await prisma.poolMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        userId: true,
        poolId: true,
        user: {
          select: {
            plan: true,
            role: true,
            poolMembers: {
              where: {
                status: 'APPROVED',
                pool: { isActive: true },
              },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!pendingMember || pendingMember.poolId !== poolId) {
      res.status(404).json({ error: 'Solicitação não encontrada neste bolão.' });
      return;
    }

    const isPlatformAdmin = pendingMember.user.role === 'ADMIN';

    if (
      !isPlatformAdmin &&
      pendingMember.user.plan === 'FREE' &&
      pendingMember.user.poolMembers.length >= 3
    ) {
      res.status(403).json({
        error: 'Este usuário já atingiu o limite de 3 bolões ativos no plano FREE.',
      });
      return;
    }

    const member = await prisma.poolMember.update({
      where: { id: memberId },
      data: { status: 'APPROVED' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    res.json({ member, message: 'Participante aprovado.' });
  } catch (err) {
    console.error('[Pool] Erro ao aprovar participante:', err);
    res.status(500).json({ error: 'Erro ao aprovar participante.' });
  }
}

// ── PATCH /api/pools/:id/members/:memberId/reject ───────────
export async function rejectMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: poolId, memberId } = req.params;

    const isOwner = await assertPoolOwner(poolId, userId);
    if (!isOwner) {
      res.status(403).json({ error: 'Apenas o admin do bolão pode rejeitar participantes.' });
      return;
    }

    const member = await prisma.poolMember.update({
      where: { id: memberId },
      data: { status: 'REJECTED' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    res.json({ member, message: 'Solicitação rejeitada.' });
  } catch (err) {
    console.error('[Pool] Erro ao rejeitar participante:', err);
    res.status(500).json({ error: 'Erro ao rejeitar participante.' });
  }
}

// ── DELETE /api/pools/:id/members/:memberId ─────────────────
export async function removeMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: poolId, memberId } = req.params;

    const isOwner = await assertPoolOwner(poolId, userId);
    if (!isOwner) {
      res.status(403).json({ error: 'Apenas o admin do bolão pode remover participantes.' });
      return;
    }

    const member = await prisma.poolMember.findUnique({
      where: { id: memberId },
      select: { id: true, userId: true, poolId: true },
    });

    if (!member || member.poolId !== poolId) {
      res.status(404).json({ error: 'Participante não encontrado neste bolão.' });
      return;
    }

    if (member.userId === userId) {
      res.status(400).json({ error: 'O admin do bolão não pode remover a si mesmo.' });
      return;
    }

    await prisma.prediction.deleteMany({
      where: { userId: member.userId, poolId },
    });

    await prisma.poolMember.update({
      where: { id: memberId },
      data: { status: 'REMOVED' },
    });

    res.json({ message: 'Participante removido do bolão.' });
  } catch (err) {
    console.error('[Pool] Erro ao remover participante:', err);
    res.status(500).json({ error: 'Erro ao remover participante.' });
  }
}

// ── PATCH /api/pools/:id/visibility ─────────────────────────
export async function updatePoolVisibility(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: poolId } = req.params;
    const { isPublic } = req.body as { isPublic?: boolean };

    if (typeof isPublic !== 'boolean') {
      res.status(400).json({ error: 'isPublic deve ser true ou false.' });
      return;
    }

    const isOwner = await assertPoolOwner(poolId, userId);
    if (!isOwner && req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas o admin do bolão pode alterar público/privado.' });
      return;
    }

    const pool = await prisma.pool.update({
      where: { id: poolId },
      data: { isPublic },
      select: { id: true, name: true, isPublic: true },
    });

    res.json({
      pool,
      message: `Bolão alterado para ${isPublic ? 'público' : 'privado'} com sucesso.`,
    });
  } catch (err) {
    console.error('[Pool] Erro ao alterar visibilidade:', err);
    res.status(500).json({ error: 'Erro ao alterar visibilidade do bolão.' });
  }
}
