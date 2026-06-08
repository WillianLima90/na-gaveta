// ============================================================
// Na Gaveta — Controller de Autenticação
// Registro, login e perfil do usuário autenticado
// ============================================================

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

// ── Registro de novo usuário ─────────────────────────────────
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;

    // Verificar se e-mail já existe
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'E-mail já cadastrado' });
      return;
    }

    // Hash da senha (salt rounds = 12)
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, displayName: true, email: true, role: true, createdAt: true },
    });

    // Gerar token JWT
    const token = generateToken(user.id, user.email, user.role);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user,
    });
  } catch (err) {
    console.error('[Auth] Erro no registro:', err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}

// ── Login ────────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const token = generateToken(user.id, user.email, user.role);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[Auth] Erro no login:', err);
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
}

// ── Perfil do usuário autenticado ────────────────────────────
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        role: true,
        plan: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { predictions: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const activeOwnedPools = await prisma.pool.count({
      where: {
        ownerId: userId,
        isActive: true,
      },
    });

    res.json({
      user: {
        ...user,
        _count: {
          ...user._count,
          ownedPools: activeOwnedPools,
        },
      },
    });
  } catch (err) {
    console.error('[Auth] Erro ao buscar perfil:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
}


// ── Atualizar perfil do usuário autenticado ──────────────────
export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const rawDisplayName = typeof req.body.displayName === 'string' ? req.body.displayName.trim() : null;
    const hasAvatarUrl = Object.prototype.hasOwnProperty.call(req.body, 'avatarUrl');
    const avatarUrl = typeof req.body.avatarUrl === 'string' ? req.body.avatarUrl : null;

    if (rawDisplayName !== null && rawDisplayName.length > 22) {
      res.status(400).json({ error: 'Nome de jogo deve ter no máximo 22 caracteres' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: rawDisplayName && rawDisplayName.length > 0 ? rawDisplayName : null,
        ...(hasAvatarUrl ? { avatarUrl } : {}),
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (err) {
    console.error('[Auth] Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
}

// ── Alterar senha do usuário autenticado ─────────────────────
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    if (currentPassword === newPassword) {
      res.status(400).json({ error: 'A nova senha deve ser diferente da senha atual.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Senha atual incorreta.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error('[Auth] Erro ao alterar senha:', err);
    res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
}

// ── Helper: gerar JWT ────────────────────────────────────────
function generateToken(userId: string, email: string, role: string): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '30d';

  return jwt.sign({ userId, email, role }, secret, { expiresIn } as jwt.SignOptions);
}
