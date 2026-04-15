// ============================================================
// Na Gaveta — Tipos TypeScript do Frontend
// ============================================================

// ── Usuário ──────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
}

// ── Autenticação ─────────────────────────────────────────────
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ── Campeonato ───────────────────────────────────────────────
export interface Championship {
  id: string;
  name: string;
  slug: string;
  season: string;
  country?: string;
  logoUrl?: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

// ── Bolão ────────────────────────────────────────────────────
export interface Pool {
  id: string;
  name: string;
  code: string;
  description?: string;
  isPublic: boolean;
  maxMembers?: number;
  ownerId: string;
  owner?: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  championship?: Pick<Championship, 'id' | 'name' | 'logoUrl'>;
  _count?: { members: number };
  createdAt: string;
}

// ── Partida ──────────────────────────────────────────────────
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

export interface Match {
  id: string;
  roundId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  matchDate: string;
  venue?: string;
}

// ── Resposta padrão da API ───────────────────────────────────
export interface ApiError {
  error: string;
  message?: string;
}
