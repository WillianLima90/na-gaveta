// ============================================================
// Na Gaveta — Tipos TypeScript centrais do backend
// ============================================================

import { Request } from 'express';

// Payload do JWT após decodificação
export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Request com usuário autenticado injetado pelo middleware
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// Resposta padrão da API
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}
