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
  prizeDescription?: string | null;
  prizeUpdatedAt?: string | null;
  rulesDescription?: string | null;
  rulesUpdatedAt?: string | null;
  paymentDescription?: string | null;
  paymentUpdatedAt?: string | null;
  canEditPrize?: boolean;
  isPublic: boolean;
  maxMembers?: number;
  ownerId: string;
  startingRoundId?: string | null;
  championshipId: string;
  bonusRoundId?: string | null;
  createdAt: string;
  isMember?: boolean;
  membershipStatus?: "PENDING" | "APPROVED" | "REJECTED" | "REMOVED" | null;
  canEditFavoriteTeam?: boolean;
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

// Sair do bolão antes do fechamento do primeiro palpite
export async function leavePool(poolId: string): Promise<{ message: string }> {
  const { data } = await api.delete(`/pools/${poolId}/leave`);
  return data;
}

export async function cancelJoinRequest(poolId: string): Promise<{ message: string }> {
  const { data } = await api.delete(`/pools/${poolId}/request`);
  return data;
}

export async function updatePoolPrize(
  poolId: string,
  prizeDescription: string
): Promise<{ pool: Pool; message: string }> {
  const { data } = await api.patch(`/pools/${poolId}/prize`, { prizeDescription });
  return data;
}

export async function updatePoolRules(
  poolId: string,
  rulesDescription: string
): Promise<{ pool: Pool; message: string }> {
  const { data } = await api.patch(`/pools/${poolId}/info-rules`, { rulesDescription });
  return data;
}

export async function updatePoolPayment(
  poolId: string,
  paymentDescription: string
): Promise<{ pool: Pool; message: string }> {
  const { data } = await api.patch(`/pools/${poolId}/payment`, { paymentDescription });
  return data;
}

// Deletar bolão (somente ADMIN do site)
export async function deletePool(poolId: string): Promise<{ message: string }> {
  const { data } = await api.delete(`/pools/${poolId}`);
  return data;
}

// ============================================================================
// Standing Prediction
// ============================================================================

export interface StandingPredictionTeam {
  teamKey: string;
  teamName: string;
  teamTla?: string | null;
  teamCrest?: string | null;
}

export interface StandingPredictionItem extends StandingPredictionTeam {
  group: 'TOP' | 'BOTTOM';
  predictedPosition: number;
}

export interface StandingPredictionResponse {
  pool: {
    id: string;
    name: string;
    ownerId: string;
    championship: {
      id: string;
      name: string;
      slug?: string;
    };
  };

  configuration: {
    enabled: boolean;
    size: number | null;
    exactPoints: number;
    groupPoints: number;
    configuredLockRound: any;
  };

  deadline: any;
  locked: boolean;

  prediction: {
    id: string;
    submittedAt: string;
    lockedAt?: string | null;
    items: StandingPredictionItem[];
  } | null;

  teams: StandingPredictionTeam[];
}

export async function getStandingPrediction(
  poolId: string
): Promise<StandingPredictionResponse> {
  const { data } = await api.get(
    `/pools/${poolId}/standing-prediction`
  );

  return data;
}

export async function saveStandingPrediction(
  poolId: string,
  items: StandingPredictionItem[]
) {
  const { data } = await api.put(
    `/pools/${poolId}/standing-prediction`,
    { items }
  );

  return data;
}

export async function updateStandingPredictionConfig(
  poolId: string,
  payload: {
    enabled: boolean;
    size: number | null;
    exactPoints: number;
    groupPoints: number;
    lockRoundId: string | null;
  }
) {
  const { data } = await api.patch(
    `/pools/${poolId}/standing-prediction/config`,
    payload
  );

  return data;
}
