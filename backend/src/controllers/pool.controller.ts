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
        championship: { select: { id: true, name: true, slug: true, season: true, logoUrl: true } },
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
    let canEditPrize = req.user?.role === 'ADMIN';

    if (userId) {
      if (!canEditPrize) {
        const firstPoolMatch = await prisma.match.findFirst({
          where: {
            round: {
              championshipId: pool.championshipId,
              ...(pool.startingRoundId ? { id: pool.startingRoundId } : {}),
            },
          },
          orderBy: { matchDate: 'asc' },
          select: { matchDate: true },
        });

        canEditPrize = !firstPoolMatch || new Date() < new Date(firstPoolMatch.matchDate.getTime() - 10 * 60 * 1000);
      }

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
        canEditFavoriteTeam,
        canEditPrize
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

// ── DELETE /api/pools/:id/request ────────────────────────────
export async function cancelJoinRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: poolId } = req.params;

    const member = await prisma.poolMember.findUnique({
      where: {
        userId_poolId: {
          userId,
          poolId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!member || member.status !== 'PENDING') {
      res.status(404).json({ error: 'Solicitação pendente não encontrada.' });
      return;
    }

    await prisma.poolMember.update({
      where: { id: member.id },
      data: { status: 'REMOVED' },
    });

    res.json({ message: 'Solicitação cancelada com sucesso.' });
  } catch (err) {
    console.error('[Pool] Erro ao cancelar solicitação:', err);
    res.status(500).json({ error: 'Erro ao cancelar solicitação.' });
  }
}

// ── Bolões do usuário autenticado ────────────────────────────
export async function myPools(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const memberships = await prisma.poolMember.findMany({
      where: {
        userId,
        status: { in: ['APPROVED', 'PENDING'] },
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
      membershipStatus: m.status,
    }));

    res.json({ pools });
  } catch (err) {
    console.error('[Pool] Erro ao buscar meus bolões:', err);
    res.status(500).json({ error: 'Erro ao buscar seus bolões' });
  }
}


// ── PATCH /api/pools/:id/rules ───────────────────────────────
export async function updatePoolRules(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: poolId } = req.params;
    const { rulesDescription } = req.body as { rulesDescription?: string };

    const isOwner = await assertPoolOwner(poolId, userId);
    const isPlatformAdmin = req.user?.role === 'ADMIN';

    if (!isOwner && !isPlatformAdmin) {
      res.status(403).json({ error: 'Apenas o admin do bolão pode alterar as regras.' });
      return;
    }

    if (!isPlatformAdmin) {
      const poolLock = await prisma.pool.findUnique({
        where: { id: poolId },
        select: {
          championshipId: true,
          startingRoundId: true,
        },
      });

      const firstPoolMatch = poolLock
        ? await prisma.match.findFirst({
            where: {
              round: {
                championshipId: poolLock.championshipId,
                ...(poolLock.startingRoundId ? { id: poolLock.startingRoundId } : {}),
              },
            },
            orderBy: { matchDate: 'asc' },
            select: { matchDate: true },
          })
        : null;

      if (firstPoolMatch && new Date() >= new Date(firstPoolMatch.matchDate.getTime() - 10 * 60 * 1000)) {
        res.status(403).json({
          error: 'As regras não podem mais ser alteradas após o fechamento do primeiro jogo do bolão.',
        });
        return;
      }
    }

    const normalizedRules =
      typeof rulesDescription === 'string' && rulesDescription.trim().length > 0
        ? rulesDescription.trim()
        : null;

    if (normalizedRules && normalizedRules.length > 5000) {
      res.status(400).json({ error: 'As regras devem ter no máximo 5000 caracteres.' });
      return;
    }

    const pool = await prisma.pool.update({
      where: { id: poolId },
      data: {
        rulesDescription: normalizedRules,
        rulesUpdatedAt: new Date(),
      },
      select: { id: true, name: true, rulesDescription: true, rulesUpdatedAt: true },
    });

    res.json({
      pool,
      message: 'Regras do bolão atualizadas com sucesso.',
    });
  } catch (err) {
    console.error('[Pool] Erro ao alterar regras:', err);
    res.status(500).json({ error: 'Erro ao alterar regras do bolão.' });
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
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const predictionCounts = await prisma.prediction.groupBy({
      by: ['userId'],
      where: { poolId },
      _count: { id: true },
    });

    const predictionCountByUserId = new Map(
      predictionCounts.map((item) => [item.userId, item._count.id])
    );

    res.json({
      members: members.map((member) => ({
        ...member,
        predictionCount: predictionCountByUserId.get(member.userId) ?? 0,
      })),
    });
  } catch (err) {
    console.error('[Pool] Erro ao listar participantes:', err);
    res.status(500).json({ error: 'Erro ao listar participantes.' });
  }
}


// ── GET /api/pools/:id/admin/prediction-status ───────────────
export async function adminPredictionStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: poolId } = req.params;

    const isOwner = await assertPoolOwner(poolId, userId);
    if (!isOwner) {
      res.status(403).json({ error: 'Apenas o admin do bolão pode ver o status dos palpites.' });
      return;
    }

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: { id: true, championshipId: true, startingRoundId: true },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    const members = await prisma.poolMember.findMany({
      where: { poolId, status: 'APPROVED' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    const now = new Date();

    const nextRound = await prisma.round.findFirst({
      where: {
        championshipId: pool.championshipId,
        matches: {
          some: {
            status: { in: ['SCHEDULED', 'LIVE'] },
            matchDate: { gte: now },
          },
        },
      },
      orderBy: { number: 'asc' },
      include: {
        matches: {
          where: {
            status: { in: ['SCHEDULED', 'LIVE'] },
            matchDate: { gte: now },
          },
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            matchDate: true,
            status: true,
          },
          orderBy: { matchDate: 'asc' },
        },
      },
    });

    const rounds = nextRound ? [nextRound] : [];

    const matchIds = rounds.flatMap((round) => round.matches.map((match) => match.id));

    const predictions = await prisma.prediction.findMany({
      where: { poolId, matchId: { in: matchIds } },
      select: { userId: true, matchId: true, updatedAt: true },
    });

    const predictionByMatchId = new Map<string, Set<string>>();
    for (const prediction of predictions) {
      if (!predictionByMatchId.has(prediction.matchId)) {
        predictionByMatchId.set(prediction.matchId, new Set<string>());
      }
      predictionByMatchId.get(prediction.matchId)!.add(prediction.userId);
    }

    const approvedUsers = members.map((member) => ({
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      avatarUrl: member.user.avatarUrl,
    }));

    res.json({
      totalMembers: members.length,
      rounds: rounds.map((round) => ({
        id: round.id,
        number: round.number,
        name: round.name,
        matches: round.matches.map((match) => {
          const doneUserIds = predictionByMatchId.get(match.id) ?? new Set<string>();
          const pendingUsers = approvedUsers.filter((user) => !doneUserIds.has(user.userId));

          return {
            id: match.id,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            matchDate: match.matchDate,
            status: match.status,
            doneCount: doneUserIds.size,
            totalMembers: members.length,
            pendingUsers,
          };
        }),
      })),
    });
  } catch (err) {
    console.error('[Pool] Erro ao buscar status dos palpites:', err);
    res.status(500).json({ error: 'Erro ao buscar status dos palpites.' });
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

// ── DELETE /api/pools/:id/leave ─────────────────────────────
export async function leavePool(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: poolId } = req.params;

    const member = await prisma.poolMember.findUnique({
      where: {
        userId_poolId: {
          userId,
          poolId,
        },
      },
      select: {
        id: true,
        userId: true,
        poolId: true,
        status: true,
        joinedAt: true,
        pool: {
          select: {
            ownerId: true,
            startingRoundId: true,
            championshipId: true,
          },
        },
      },
    });

    if (!member || member.status !== 'APPROVED') {
      res.status(404).json({ error: 'Você não está participando deste bolão.' });
      return;
    }

    if (member.pool.ownerId === userId) {
      res.status(400).json({ error: 'O admin do bolão não pode sair do próprio bolão.' });
      return;
    }

    const firstMatch = await prisma.match.findFirst({
      where: {
        round: {
          championshipId: member.pool.championshipId,
          ...(member.pool.startingRoundId ? { id: member.pool.startingRoundId } : {}),
        },
        matchDate: { gt: member.joinedAt },
      },
      orderBy: { matchDate: 'asc' },
      select: { matchDate: true },
    });

    if (firstMatch) {
      const lockTime = new Date(firstMatch.matchDate.getTime() - 10 * 60 * 1000);
      if (new Date() >= lockTime) {
        res.status(403).json({
          error: 'Não é mais possível sair deste bolão. Após o fechamento do primeiro palpite, apenas o admin pode remover participantes.',
        });
        return;
      }
    }

    await prisma.prediction.deleteMany({
      where: { userId, poolId },
    });

    await prisma.poolMember.update({
      where: { id: member.id },
      data: { status: 'REMOVED' },
    });

    res.json({ message: 'Você saiu do bolão com sucesso.' });
  } catch (err) {
    console.error('[Pool] Erro ao sair do bolão:', err);
    res.status(500).json({ error: 'Erro ao sair do bolão.' });
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


// ── PATCH /api/pools/:id/prize ───────────────────────────────
export async function updatePoolPrize(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: poolId } = req.params;
    const { prizeDescription } = req.body as { prizeDescription?: string };

    const isOwner = await assertPoolOwner(poolId, userId);
    const isPlatformAdmin = req.user?.role === 'ADMIN';

    if (!isOwner && !isPlatformAdmin) {
      res.status(403).json({ error: 'Apenas o admin do bolão pode alterar a premiação.' });
      return;
    }

    if (!isPlatformAdmin) {
      const poolLock = await prisma.pool.findUnique({
        where: { id: poolId },
        select: {
          championshipId: true,
          startingRoundId: true,
        },
      });

      const firstPoolMatch = poolLock
        ? await prisma.match.findFirst({
            where: {
              round: {
                championshipId: poolLock.championshipId,
                ...(poolLock.startingRoundId ? { id: poolLock.startingRoundId } : {}),
              },
            },
            orderBy: { matchDate: 'asc' },
            select: { matchDate: true },
          })
        : null;

      if (firstPoolMatch && new Date() >= new Date(firstPoolMatch.matchDate.getTime() - 10 * 60 * 1000)) {
        res.status(403).json({
          error: 'A premiação não pode mais ser alterada após o fechamento do primeiro jogo do bolão.',
        });
        return;
      }
    }

    const normalizedPrize =
      typeof prizeDescription === 'string' && prizeDescription.trim().length > 0
        ? prizeDescription.trim()
        : null;

    if (normalizedPrize && normalizedPrize.length > 3000) {
      res.status(400).json({ error: 'A premiação deve ter no máximo 3000 caracteres.' });
      return;
    }

    const pool = await prisma.pool.update({
      where: { id: poolId },
      data: {
        prizeDescription: normalizedPrize,
        prizeUpdatedAt: new Date(),
      },
      select: { id: true, name: true, prizeDescription: true, prizeUpdatedAt: true },
    });

    res.json({
      pool,
      message: 'Premiação do bolão atualizada com sucesso.',
    });
  } catch (err) {
    console.error('[Pool] Erro ao alterar premiação:', err);
    res.status(500).json({ error: 'Erro ao alterar premiação do bolão.' });
  }
}


export async function updatePoolPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id: poolId } = req.params;
    const { paymentDescription } = req.body as { paymentDescription?: string };

    const isOwner = await assertPoolOwner(poolId, userId);
    const isPlatformAdmin = req.user?.role === 'ADMIN';

    if (!isOwner && !isPlatformAdmin) {
      res.status(403).json({ error: 'Apenas o admin do bolão pode alterar os dados de pagamento.' });
      return;
    }

    if (!isPlatformAdmin) {
      const poolLock = await prisma.pool.findUnique({
        where: { id: poolId },
        select: {
          championshipId: true,
          startingRoundId: true,
        },
      });

      const firstPoolMatch = poolLock
        ? await prisma.match.findFirst({
            where: {
              round: {
                championshipId: poolLock.championshipId,
                ...(poolLock.startingRoundId ? { id: poolLock.startingRoundId } : {}),
              },
            },
            orderBy: { matchDate: 'asc' },
            select: { matchDate: true },
          })
        : null;

      if (firstPoolMatch && new Date() >= new Date(firstPoolMatch.matchDate.getTime() - 10 * 60 * 1000)) {
        res.status(403).json({
          error: 'Os dados de pagamento não podem mais ser alterados após o fechamento do primeiro jogo do bolão.',
        });
        return;
      }
    }

    const normalizedPayment =
      typeof paymentDescription === 'string' && paymentDescription.trim().length > 0
        ? paymentDescription.trim()
        : null;

    if (normalizedPayment && normalizedPayment.length > 3000) {
      res.status(400).json({ error: 'Os dados de pagamento devem ter no máximo 3000 caracteres.' });
      return;
    }

    const pool = await prisma.pool.update({
      where: { id: poolId },
      data: {
        paymentDescription: normalizedPayment,
        paymentUpdatedAt: new Date(),
      },
      select: { id: true, name: true, paymentDescription: true, paymentUpdatedAt: true },
    });

    res.json({
      pool,
      message: 'Dados de pagamento atualizados com sucesso.',
    });
  } catch (err) {
    console.error('[Pool] Erro ao alterar pagamento:', err);
    res.status(500).json({ error: 'Erro ao alterar dados de pagamento do bolão.' });
  }
}
