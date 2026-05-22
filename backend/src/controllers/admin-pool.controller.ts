import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';

export async function listAdminPools(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas ADMIN pode acessar bolões da plataforma.' });
      return;
    }

    const pools = await prisma.pool.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        isPublic: true,
        isActive: true,
        createdAt: true,
        owner: { select: { id: true, name: true, email: true } },
        championship: { select: { id: true, name: true } },
        _count: { select: { members: true, predictions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ pools });
  } catch (err) {
    console.error('[AdminPools] Erro ao listar bolões:', err);
    res.status(500).json({ error: 'Erro ao buscar bolões da plataforma.' });
  }
}

export async function updateAdminPoolActive(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas ADMIN pode ativar/desativar bolões.' });
      return;
    }

    const { id } = req.params;
    const { isActive } = req.body as { isActive?: boolean };

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'isActive deve ser true ou false.' });
      return;
    }

    const pool = await prisma.pool.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado.' });
      return;
    }

    const updatedPool = await prisma.pool.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    res.json({
      message: `Bolão ${isActive ? 'ativado' : 'desativado'} com sucesso.`,
      pool: updatedPool,
    });
  } catch (err) {
    console.error('[AdminPools] Erro ao atualizar status do bolão:', err);
    res.status(500).json({ error: 'Erro ao atualizar status do bolão.' });
  }
}
