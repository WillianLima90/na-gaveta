import { Response } from 'express';
import { StandingPredictionGroup } from '@prisma/client';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

type PredictionItemInput = {
  group: StandingPredictionGroup;
  predictedPosition: number;
  teamKey: string;
  teamName: string;
  teamTla?: string | null;
  teamCrest?: string | null;
};

function normalizeTeamKey(value: string): string {
  return value.trim().toLowerCase();
}

async function resolveMemberLockRound(
  poolId: string,
  championshipId: string,
  memberJoinedAt: Date,
  configuredLockRoundId: string | null
) {
  if (configuredLockRoundId) {
    const configuredRound = await prisma.round.findFirst({
      where: {
        id: configuredLockRoundId,
        championshipId,
      },
      select: {
        id: true,
        number: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    });

    if (configuredRound && configuredRound.endDate > memberJoinedAt) {
      return configuredRound;
    }
  }

  return prisma.round.findFirst({
    where: {
      championshipId,
      endDate: { gt: memberJoinedAt },
    },
    orderBy: { number: 'asc' },
    select: {
      id: true,
      number: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  });
}

async function getChampionshipTeams(championshipId: string) {
  const matches = await prisma.match.findMany({
    where: {
      round: { championshipId },
    },
    select: {
      homeTeam: true,
      awayTeam: true,
      homeTeamTla: true,
      awayTeamTla: true,
      homeTeamCrest: true,
      awayTeamCrest: true,
    },
  });

  const teams = new Map<
    string,
    {
      teamKey: string;
      teamName: string;
      teamTla: string | null;
      teamCrest: string | null;
    }
  >();

  for (const match of matches) {
    const homeKey = normalizeTeamKey(match.homeTeam);
    const awayKey = normalizeTeamKey(match.awayTeam);

    if (!teams.has(homeKey)) {
      teams.set(homeKey, {
        teamKey: homeKey,
        teamName: match.homeTeam,
        teamTla: match.homeTeamTla,
        teamCrest: match.homeTeamCrest,
      });
    }

    if (!teams.has(awayKey)) {
      teams.set(awayKey, {
        teamKey: awayKey,
        teamName: match.awayTeam,
        teamTla: match.awayTeamTla,
        teamCrest: match.awayTeamCrest,
      });
    }
  }

  return Array.from(teams.values()).sort((a, b) =>
    a.teamName.localeCompare(b.teamName, 'pt-BR')
  );
}

// GET /api/pools/:id/standing-prediction
export async function getStandingPrediction(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const poolId = req.params.id;

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        championshipId: true,
        standingPredictionEnabled: true,
        standingPredictionSize: true,
        standingPredictionExactPoints: true,
        standingPredictionGroupPoints: true,
        standingPredictionLockRoundId: true,
        standingPredictionLockRound: {
          select: {
            id: true,
            number: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        championship: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    const membership = await prisma.poolMember.findUnique({
      where: {
        userId_poolId: { userId, poolId },
      },
      include: {
        standingPrediction: {
          include: {
            lockRound: {
              select: {
                id: true,
                number: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
            items: {
              orderBy: [
                { group: 'asc' },
                { predictedPosition: 'asc' },
              ],
            },
          },
        },
      },
    });

    if (!membership || membership.status !== 'APPROVED') {
      res.status(403).json({
        error: 'Você precisa ser participante aprovado deste bolão.',
      });
      return;
    }

    const resolvedLockRound =
      membership.standingPrediction?.lockRound ??
      (await resolveMemberLockRound(
        pool.id,
        pool.championshipId,
        membership.joinedAt,
        pool.standingPredictionLockRoundId
      ));

    const now = new Date();
    const locked =
      Boolean(membership.standingPrediction?.lockedAt) ||
      Boolean(resolvedLockRound && resolvedLockRound.endDate <= now);

    const teams = await getChampionshipTeams(pool.championshipId);

    res.json({
      pool: {
        id: pool.id,
        name: pool.name,
        ownerId: pool.ownerId,
        championship: pool.championship,
      },
      configuration: {
        enabled: pool.standingPredictionEnabled,
        size: pool.standingPredictionSize,
        exactPoints: pool.standingPredictionExactPoints,
        groupPoints: pool.standingPredictionGroupPoints,
        configuredLockRound: pool.standingPredictionLockRound,
      },
      deadline: resolvedLockRound,
      locked,
      prediction: membership.standingPrediction,
      teams,
    });
  } catch (err) {
    console.error('[StandingPrediction] Erro ao buscar:', err);
    res.status(500).json({
      error: 'Erro ao buscar previsão da classificação.',
    });
  }
}

// PUT /api/pools/:id/standing-prediction
export async function saveStandingPrediction(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const poolId = req.params.id;
    const { items } = req.body as { items?: PredictionItemInput[] };

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: {
        id: true,
        championshipId: true,
        isActive: true,
        standingPredictionEnabled: true,
        standingPredictionSize: true,
        standingPredictionLockRoundId: true,
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    if (!pool.isActive) {
      res.status(400).json({ error: 'Este bolão não está ativo.' });
      return;
    }

    if (!pool.standingPredictionEnabled || !pool.standingPredictionSize) {
      res.status(400).json({
        error: 'A previsão da classificação não está habilitada neste bolão.',
      });
      return;
    }

    const membership = await prisma.poolMember.findUnique({
      where: {
        userId_poolId: { userId, poolId },
      },
      include: {
        standingPrediction: {
          include: {
            lockRound: {
              select: {
                id: true,
                number: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    });

    if (!membership || membership.status !== 'APPROVED') {
      res.status(403).json({
        error: 'Você precisa ser participante aprovado deste bolão.',
      });
      return;
    }

    const lockRound =
      membership.standingPrediction?.lockRound ??
      (await resolveMemberLockRound(
        pool.id,
        pool.championshipId,
        membership.joinedAt,
        pool.standingPredictionLockRoundId
      ));

    if (!lockRound) {
      res.status(400).json({
        error: 'Não foi possível determinar o prazo desta previsão.',
      });
      return;
    }

    if (
      membership.standingPrediction?.lockedAt ||
      lockRound.endDate <= new Date()
    ) {
      res.status(400).json({
        error: `O prazo encerrou na ${lockRound.name}.`,
      });
      return;
    }

    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'A lista de clubes é obrigatória.' });
      return;
    }

    const size = pool.standingPredictionSize;
    const expectedCount = size * 2;

    if (items.length !== expectedCount) {
      res.status(400).json({
        error: `Selecione exatamente ${size} clubes no grupo superior e ${size} no grupo inferior.`,
      });
      return;
    }

    const topItems = items.filter(
      (item) => item.group === StandingPredictionGroup.TOP
    );
    const bottomItems = items.filter(
      (item) => item.group === StandingPredictionGroup.BOTTOM
    );

    if (topItems.length !== size || bottomItems.length !== size) {
      res.status(400).json({
        error: `A previsão deve conter G${size} e Z${size}.`,
      });
      return;
    }

    for (const groupItems of [topItems, bottomItems]) {
      const positions = groupItems
        .map((item) => Number(item.predictedPosition))
        .sort((a, b) => a - b);

      const expectedPositions = Array.from(
        { length: size },
        (_, index) => index + 1
      );

      if (
        positions.length !== expectedPositions.length ||
        positions.some(
          (position, index) => position !== expectedPositions[index]
        )
      ) {
        res.status(400).json({
          error: `Cada grupo deve possuir as posições de 1 até ${size}, sem repetição.`,
        });
        return;
      }
    }

    const normalizedItems = items.map((item) => ({
      group: item.group,
      predictedPosition: Number(item.predictedPosition),
      teamKey: normalizeTeamKey(item.teamKey || item.teamName),
      teamName: String(item.teamName || '').trim(),
      teamTla: item.teamTla ? String(item.teamTla).trim() : null,
      teamCrest: item.teamCrest ? String(item.teamCrest).trim() : null,
    }));

    if (normalizedItems.some((item) => !item.teamName || !item.teamKey)) {
      res.status(400).json({
        error: 'Todos os clubes selecionados precisam ser válidos.',
      });
      return;
    }

    const uniqueTeamKeys = new Set(
      normalizedItems.map((item) => item.teamKey)
    );

    if (uniqueTeamKeys.size !== expectedCount) {
      res.status(400).json({
        error: 'O mesmo clube não pode aparecer mais de uma vez.',
      });
      return;
    }

    const championshipTeams = await getChampionshipTeams(
      pool.championshipId
    );
    const validTeams = new Map(
      championshipTeams.map((team) => [team.teamKey, team])
    );

    for (const item of normalizedItems) {
      if (!validTeams.has(item.teamKey)) {
        res.status(400).json({
          error: `O clube "${item.teamName}" não pertence a este campeonato.`,
        });
        return;
      }
    }

    const prediction = await prisma.$transaction(async (tx) => {
      const standingPrediction = await tx.standingPrediction.upsert({
        where: {
          poolMemberId: membership.id,
        },
        create: {
          poolMemberId: membership.id,
          lockRoundId: lockRound.id,
          submittedAt: new Date(),
        },
        update: {
          lockRoundId: lockRound.id,
          submittedAt: new Date(),
          points: 0,
          scoredAt: null,
        },
      });

      await tx.standingPredictionItem.deleteMany({
        where: {
          standingPredictionId: standingPrediction.id,
        },
      });

      await tx.standingPredictionItem.createMany({
        data: normalizedItems.map((item) => {
          const officialTeam = validTeams.get(item.teamKey)!;

          return {
            standingPredictionId: standingPrediction.id,
            group: item.group,
            predictedPosition: item.predictedPosition,
            teamKey: officialTeam.teamKey,
            teamName: officialTeam.teamName,
            teamTla: officialTeam.teamTla,
            teamCrest: officialTeam.teamCrest,
          };
        }),
      });

      return tx.standingPrediction.findUnique({
        where: { id: standingPrediction.id },
        include: {
          lockRound: true,
          items: {
            orderBy: [
              { group: 'asc' },
              { predictedPosition: 'asc' },
            ],
          },
        },
      });
    });

    res.status(201).json({
      message: 'Previsão da classificação salva com sucesso!',
      prediction,
    });
  } catch (err) {
    console.error('[StandingPrediction] Erro ao salvar:', err);
    res.status(500).json({
      error: 'Erro ao salvar previsão da classificação.',
    });
  }
}

// PATCH /api/pools/:id/standing-prediction/config
export async function updateStandingPredictionConfig(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const poolId = req.params.id;
    const {
      enabled,
      size,
      exactPoints,
      groupPoints,
      lockRoundId,
    } = req.body;

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: {
        id: true,
        ownerId: true,
        championshipId: true,
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    if (pool.ownerId !== userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({
        error: 'Apenas o dono do bolão pode alterar esta configuração.',
      });
      return;
    }

    const parsedSize = size === null ? null : Number(size);
    const parsedExactPoints = Number(exactPoints);
    const parsedGroupPoints = Number(groupPoints);

    if (Boolean(enabled) && ![4, 5, 6].includes(parsedSize as number)) {
      res.status(400).json({
        error: 'A modalidade deve ser G4/Z4, G5/Z5 ou G6/Z6.',
      });
      return;
    }

    if (
      !Number.isInteger(parsedExactPoints) ||
      parsedExactPoints < 0 ||
      !Number.isInteger(parsedGroupPoints) ||
      parsedGroupPoints < 0
    ) {
      res.status(400).json({
        error: 'Os valores de pontuação devem ser inteiros não negativos.',
      });
      return;
    }

    if (lockRoundId) {
      const validRound = await prisma.round.findFirst({
        where: {
          id: String(lockRoundId),
          championshipId: pool.championshipId,
        },
      });

      if (!validRound) {
        res.status(400).json({
          error: 'A rodada de encerramento não pertence a este campeonato.',
        });
        return;
      }
    }

    const updatedPool = await prisma.pool.update({
      where: { id: poolId },
      data: {
        standingPredictionEnabled: Boolean(enabled),
        standingPredictionSize: Boolean(enabled) ? parsedSize : null,
        standingPredictionExactPoints: parsedExactPoints,
        standingPredictionGroupPoints: parsedGroupPoints,
        standingPredictionLockRoundId: lockRoundId
          ? String(lockRoundId)
          : null,
      },
      select: {
        id: true,
        standingPredictionEnabled: true,
        standingPredictionSize: true,
        standingPredictionExactPoints: true,
        standingPredictionGroupPoints: true,
        standingPredictionLockRoundId: true,
        standingPredictionLockRound: {
          select: {
            id: true,
            number: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    res.json({
      message: 'Configuração atualizada com sucesso!',
      configuration: updatedPool,
    });
  } catch (err) {
    console.error('[StandingPrediction] Erro ao configurar:', err);
    res.status(500).json({
      error: 'Erro ao configurar previsão da classificação.',
    });
  }
}
