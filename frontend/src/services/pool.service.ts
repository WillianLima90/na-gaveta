// ============================================================
// Na Gaveta — Serviço de Bolões
// Comunicação com /api/pools
// ============================================================

import api from './api';

export interface Pool {
  id: string;
  name: string;
  code: string;
  description?: string;
  isPublic: boolean;
  maxMembers?: number;
  ownerId: string;
  championshipId: string;
  bonusRoundId?: string | null;
  createdAt: string;
  isMember?: boolean;
  owner?: { id: string; name: string; avatarUrl?: string };
  championship?: { id: string; name: string; slug?: string; season?: string; logoUrl?: string };
  members?: Array<{
    id: string;
    userId: string;
    score: number;
    joinedAt: string;
    user: { id: string; name: string; avatarUrl?: string };
  }>;
  _count?: { members: number };
}

export interface CreatePoolData {
  name: string;
  description?: string;
  championshipId: string;
  isPublic: boolean;
  maxMembers?: number;
}

// Listar bolões públicos
export async function listPools(): Promise<Pool[]> {
  const { data } = await api.get('/pools');
  return data.pools;
}

// Meus bolões (autenticado)
export async function myPools(): Promise<Pool[]> {
  const { data } = await api.get('/pools/user/mine');
  return data.pools;
}

// Detalhe de um bolão
export async function getPool(id: string): Promise<Pool> {
  const { data } = await api.get(`/pools/${id}`);
  return data.pool;
}

// Criar bolão
export async function createPool(poolData: CreatePoolData): Promise<Pool> {
  const { data } = await api.post('/pools', poolData);
  return data.pool;
}

// Entrar no bolão por ID (bolões públicos)
export async function joinPoolById(poolId: string): Promise<{ message: string; poolId: string }> {
  const { data } = await api.post(`/pools/${poolId}/join`);
  return data;
}

// Entrar no bolão por código de convite
export async function joinPoolByCode(code: string): Promise<{ message: string; poolId: string }> {
  const { data } = await api.post('/pools/join', { code });
  return data;
}

// Definir time do coração no bolão
export async function setFavoriteTeam(poolId: string, team: string): Promise<{ success: boolean }> {
  const { data } = await api.patch(`/pools/${poolId}/favorite-team`, { team });
  return data;
}
