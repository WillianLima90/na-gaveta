// ============================================================
// Na Gaveta — Middleware de autenticação JWT
// authenticate        → obrigatório, retorna 401 se sem token
// optionalAuthenticate → opcional, injeta user se token válido
// ============================================================

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload } from '../types';

// ── Autenticação obrigatória ─────────────────────────────────
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não fornecido' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('[Auth] JWT_SECRET não configurado');
    res.status(500).json({ error: 'Configuração de autenticação inválida' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// ── Autenticação opcional ────────────────────────────────────
// Não bloqueia a requisição, mas injeta req.user se token válido
export function optionalAuthenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // sem token — continua sem usuário
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) return next();

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
  } catch {
    // token inválido — ignora e continua sem usuário
  }

  next();
}
