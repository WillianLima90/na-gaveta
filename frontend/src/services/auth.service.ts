// ============================================================
// Na Gaveta — Serviço de Autenticação
// ============================================================

import api from './api';
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '../types';

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  async getProfile(): Promise<User> {
    const { data } = await api.get<{ user: User }>('/auth/me');
    return data.user;
  },

  // Persistir sessão no localStorage
  saveSession(token: string, user: User): void {
    localStorage.setItem('ng_token', token);
    localStorage.setItem('ng_user', JSON.stringify(user));
  },

  clearSession(): void {
    localStorage.removeItem('ng_token');
    localStorage.removeItem('ng_user');
  },

  getStoredToken(): string | null {
    return localStorage.getItem('ng_token');
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem('ng_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
};
