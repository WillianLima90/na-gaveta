import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';

const ALLOWED_ROLES = ['USER', 'POOL_ADMIN', 'ADMIN'] as const;

export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas ADMIN pode acessar usuários.' });
      return;
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            ownedPools: true,
            poolMembers: true,
            predictions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (err) {
    console.error('[AdminUsers] Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
}

export async function updateUserRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas ADMIN pode alterar permissões.' });
      return;
    }

    const { id } = req.params;
    const { role } = req.body as { role?: string };

    if (!role || !ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
      res.status(400).json({ error: 'Role inválida. Use USER, POOL_ADMIN ou ADMIN.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    res.json({
      message: 'Permissão atualizada com sucesso.',
      user: updatedUser,
    });
  } catch (err) {
    console.error('[AdminUsers] Erro ao atualizar role:', err);
    res.status(500).json({ error: 'Erro ao atualizar permissão.' });
  }
}

export async function updateUserActive(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas ADMIN pode ativar/desativar usuários.' });
      return;
    }

    const { id } = req.params;
    const { isActive } = req.body as { isActive?: boolean };

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'isActive deve ser true ou false.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    res.json({
      message: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso.`,
      user: updatedUser,
    });
  } catch (err) {
    console.error('[AdminUsers] Erro ao atualizar isActive:', err);
    res.status(500).json({ error: 'Erro ao atualizar status do usuário.' });
  }
}
