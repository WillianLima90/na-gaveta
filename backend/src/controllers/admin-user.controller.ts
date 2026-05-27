import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';

const ALLOWED_ROLES = ['USER', 'POOL_ADMIN', 'ADMIN'] as const;
const ALLOWED_PLANS = ['FREE', 'PRO', 'BUSINESS'] as const;

export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas ADMIN pode acessar usuários.' });
      return;
    }

    const usersRaw = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            ownedPools: true,
            poolMembers: true,
            predictions: true,
          },
        },
        ownedPools: {
          select: {
            id: true,
            name: true,
          },
        },
        poolMembers: {
          where: { status: 'APPROVED' },
          select: {
            pool: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const users = usersRaw.map((user) => ({
      ...user,
      _count: {
        ...user._count,
        poolMembers: user.poolMembers.length,
      },
    }));

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
        plan: true,
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
        plan: true,
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




export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas ADMIN pode excluir usuários.' });
      return;
    }

    const { id } = req.params;

    if (req.user.userId === id) {
      res.status(400).json({ error: 'Você não pode excluir o próprio usuário.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            ownedPools: true,
            predictions: true,
          },
        },
        poolMembers: {
          where: { status: { in: ['PENDING', 'APPROVED'] } },
          select: { id: true },
        },
      },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    if (existingUser.role === 'ADMIN') {
      res.status(400).json({ error: 'Não é permitido excluir outro ADMIN.' });
      return;
    }

    if (
      existingUser._count.ownedPools > 0 ||
      existingUser._count.predictions > 0 ||
      existingUser.poolMembers.length > 0
    ) {
      res.status(400).json({
        error: 'Usuário possui vínculo com bolões ou palpites. Utilize desativação em vez de exclusão.',
      });
      return;
    }

    await prisma.notification.deleteMany({
      where: { userId: id },
    });

    await prisma.matchResultHistory.deleteMany({
      where: { adminUserId: id },
    });

    await prisma.user.delete({
      where: { id },
    });

    res.json({
      message: 'Usuário excluído definitivamente com sucesso.',
    });
  } catch (err) {
    console.error('[AdminUsers] Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
}


export async function updateUserPlan(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas ADMIN pode alterar planos.' });
      return;
    }

    const { id } = req.params;
    const { plan } = req.body as { plan?: string };

    if (!plan || !ALLOWED_PLANS.includes(plan as (typeof ALLOWED_PLANS)[number])) {
      res.status(400).json({ error: 'Plano inválido. Use FREE, PRO ou BUSINESS.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, plan: true },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { plan },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        isActive: true,
      },
    });

    res.json({
      message: 'Plano atualizado com sucesso.',
      user: updatedUser,
    });
  } catch (err) {
    console.error('[AdminUsers] Erro ao atualizar plano:', err);
    res.status(500).json({ error: 'Erro ao atualizar plano.' });
  }
}
