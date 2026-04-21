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
      select: { id: true, name: true, email: true, role: true, createdAt: true },
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
        email: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: { ownedPools: true, predictions: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error('[Auth] Erro ao buscar perfil:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
}

// ── Helper: gerar JWT ────────────────────────────────────────
function generateToken(userId: string, email: string, role: string): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign({ userId, email, role }, secret, { expiresIn } as jwt.SignOptions);
}
