// ============================================================
// Na Gaveta — Controller de Campeonatos
// Listagem e detalhe de campeonatos disponíveis
// ============================================================

import { Request, Response } from 'express';
import axios from 'axios';
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


// ── Tabela oficial do campeonato via API externa ─────────────
export async function getChampionshipStandings(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const championship = await prisma.championship.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    });

    if (!championship) {
      res.status(404).json({ error: 'Campeonato não encontrado' });
      return;
    }

    const apiKey = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: 'FOOTBALL_API_KEY ausente.' });
      return;
    }

    // Por enquanto, Brasileirão Série A usa BSA na football-data.org
    const competitionCode = championship.slug.includes('brasileirao') ? 'BSA' : null;

    if (!competitionCode) {
      res.status(400).json({ error: 'Tabela oficial ainda não configurada para este campeonato.' });
      return;
    }

    const response = await axios.get(
      `https://api.football-data.org/v4/competitions/${competitionCode}/standings`,
      { headers: { 'X-Auth-Token': apiKey } }
    );

    const standings = response.data.standings?.[0]?.table ?? [];

    res.json({
      championshipId: championship.id,
      championshipName: championship.name,
      standings,
    });
  } catch (err) {
    console.error('[Championship] Erro ao buscar tabela oficial:', err);
    res.status(500).json({ error: 'Erro ao buscar tabela oficial do campeonato.' });
  }
}
