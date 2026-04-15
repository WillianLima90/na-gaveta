// ============================================================
// Na Gaveta — Controller de Campeonatos
// Listagem e detalhe de campeonatos disponíveis
// ============================================================

import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// ── Listar campeonatos ativos ────────────────────────────────
export async function listChampionships(_req: Request, res: Response): Promise<void> {
  try {
    const championships = await prisma.championship.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { rounds: true, pools: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    res.json({ championships });
  } catch (err) {
    console.error('[Championship] Erro ao listar:', err);
    res.status(500).json({ error: 'Erro ao buscar campeonatos' });
  }
}

// ── Detalhe de um campeonato com rodadas ─────────────────────
export async function getChampionship(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const championship = await prisma.championship.findUnique({
      where: { id },
      include: {
        rounds: {
          include: {
            matches: { orderBy: { matchDate: 'asc' } },
          },
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!championship) {
      res.status(404).json({ error: 'Campeonato não encontrado' });
      return;
    }

    res.json({ championship });
  } catch (err) {
    console.error('[Championship] Erro ao buscar:', err);
    res.status(500).json({ error: 'Erro ao buscar campeonato' });
  }
}
