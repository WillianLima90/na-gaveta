// ============================================================
// Na Gaveta — Serviço de Partidas, Palpites, Ranking e Regras
// v2: adiciona ranking por rodada, highlights e histórico
// ============================================================

import api from './api';

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

// Palpite do usuário logado em uma partida
export interface MyPrediction {
  id: string;
  homeScoreTip: number;
  awayScoreTip: number;
  isJoker?: boolean;
  points?: number | null;
  scoredAt?: string | null;
  createdAt: string;
}

export interface Match {
  id: string;
  roundId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status: MatchStatus;
  matchDate: string;
  venue?: string;
  isJoker: boolean;
  myPrediction?: MyPrediction | null;
}

export interface Round {
  id: string;
  number: number;
  name: string;
  startDate: string;
  endDate: string;
  isOpen: boolean;
  matches: Match[];
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  poolId: string;
  homeScoreTip: number;
  awayScoreTip: number;
  points?: number | null;
  scoredAt?: string | null;
  createdAt: string;
  match?: {
    homeTeam: string;
    awayTeam: string;
    matchDate: string;
    homeScore?: number | null;
    awayScore?: number | null;
    status: MatchStatus;
    isJoker: boolean;
  };
}

export interface ScoreRule {
  id: string;
  poolId: string;
  pointsForOutcome: number;
  pointsForHomeGoals: number;
  pointsForAwayGoals: number;
  exactScoreBonus: number;
  jokerMultiplier: number;
  bonusRoundMultiplier: number;
}

// Ranking geral — campos alinhados com statistics.service do backend
export interface RankingEntry {
  position: number;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  favoriteTeam?: string | null;
  totalPoints: number;
  exactScores: number;
  correctOutcomes: number;
  totalPredictions: number;
  scoredPredictions: number;
  missedPredictions: number;
  isCurrentUser: boolean;
}

// Ranking por rodada
export interface RoundRankingEntry {
  position: number;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  favoriteTeam?: string | null;
  roundPoints: number;
  exactScores: number;
  correctOutcomes: number;
  totalPredictions: number;
  isCurrentUser: boolean;
}

// Destaques da rodada
export interface RoundHighlights {
  roundId: string;
  roundName: string;
  totalParticipants: number;
  bestUser: {
    userId: string;
    name: string;
    avatarUrl?: string | null;
    roundPoints: number;
    exactScores: number;
  } | null;
  topScore: number;
  averageScore: number;
  totalExactScores: number;
  totalCorrectOutcomes: number;
  totalPredictions: number;
}

// Histórico do usuário por rodada
export interface UserRoundHistory {
  roundId: string;
  roundNumber: number;
  roundName: string;
  points: number;
  exactScores: number;
  correctOutcomes: number;
  totalPredictions: number;
}

export interface UserPoolHistory {
  userId: string;
  name: string;
  totalPoints: number;
  exactScores: number;
  correctOutcomes: number;
  totalPredictions: number;
  rounds: UserRoundHistory[];
}

// ── Partidas ──────────────────────────────────────────────────

export async function getPoolMatches(poolId: string): Promise<Round[]> {
  console.log('[Frontend] getPoolMatches', poolId);
  const { data } = await api.get(`/pools/${poolId}/matches`);
  console.log('[Frontend] getPoolMatches response', data);
  return data.rounds;
}

// ── Palpites ──────────────────────────────────────────────────

export async function savePrediction(payload: {
  matchId: string;
  poolId: string;
  homeScoreTip: number;
  awayScoreTip: number;
  isJoker?: boolean;
}): Promise<Prediction> {
  const { data } = await api.post('/predictions', payload);
  return data.prediction;
}

export async function myPredictions(poolId?: string): Promise<Prediction[]> {
  const params = poolId ? { poolId } : {};
  const { data } = await api.get('/predictions/me', { params });
  return data.predictions;
}

// ── Ranking geral ─────────────────────────────────────────────

export async function getPoolRanking(poolId: string): Promise<{
  ranking: RankingEntry[];
  totalMembers: number;
  poolName: string;
}> {
  const { data } = await api.get(`/pools/${poolId}/ranking`);
  return data;
}

// ── Ranking por rodada ────────────────────────────────────────

export async function getRoundRanking(
  poolId: string,
  roundId: string
): Promise<{
  ranking: RoundRankingEntry[];
  roundName: string;
  roundNumber: number;
}> {
  const { data } = await api.get(`/pools/${poolId}/rounds/${roundId}/ranking`);
  return data;
}

// ── Destaques da rodada ───────────────────────────────────────

export async function getRoundHighlights(
  poolId: string,
  roundId: string
): Promise<{ highlights: RoundHighlights }> {
  const { data } = await api.get(`/pools/${poolId}/rounds/${roundId}/highlights`);
  return data;
}

// ── Histórico do usuário ──────────────────────────────────────

export async function getUserHistory(
  poolId: string,
  userId: string
): Promise<{ history: UserPoolHistory }> {
  const { data } = await api.get(`/pools/${poolId}/users/${userId}/history`);
  return data;
}

// ── Regras de pontuação ───────────────────────────────────────

export async function getPoolRules(poolId: string): Promise<{ rules: ScoreRule; locked: boolean }> {
  const { data } = await api.get(`/pools/${poolId}/rules`);
  return {
    rules: data.rules,
    locked: Boolean(data.locked),
  };
}

export async function updatePoolRules(
  poolId: string,
  rules: Partial<Omit<ScoreRule, 'id' | 'poolId'>>
): Promise<ScoreRule> {
  const { data } = await api.patch(`/pools/${poolId}/rules`, rules);
  return data.rules;
}

// ── Admin: registrar resultado de partida ─────────────────────

export async function setMatchResult(
  matchId: string,
  payload: { homeScore: number; awayScore: number; status?: MatchStatus }
): Promise<{ match: Match; predictionsScored: number; message: string }> {
  const { data } = await api.patch(`/matches/${matchId}/result`, payload);
  return data;
}

export async function toggleMatchJoker(
  matchId: string,
  isJoker: boolean
): Promise<{ match: Match; message: string }> {
  const { data } = await api.patch(`/matches/${matchId}/joker`, { isJoker });
  return data;
}

// ── Summary do usuário (engajamento) ─────────────────────────

export interface UserSummary {
  userId: string;
  name: string;
  poolId: string;
  poolName: string;
  position: number;
  totalPoints: number;
  totalMembers: number;
  leaderPoints: number;
  diffToLeader: number;
  rival: {
    userId: string;
    name: string;
    points: number;
    diffToRival: number;
  } | null;
  streak: number;
  bestRoundPoints: number;
  bestRoundName: string;
  exactScores: number;
  correctOutcomes: number;
  totalPredictions: number;
  pendingMatches: number;
}

export async function getUserSummary(
  poolId: string,
  userId: string
): Promise<UserSummary> {
  const { data } = await api.get(`/pools/${poolId}/users/${userId}/summary`);
  return data;
}

// ── Vencedores de rodada (escudos) ────────────────────────────

export interface RoundWinEntry {
  roundId: string;
  roundName: string;
  roundNumber: number;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  favoriteTeam?: string | null;
  roundPoints: number;
}

export interface UserRoundWins {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  wins: RoundWinEntry[];
  totalWins: number;
}

export async function getPoolRoundWinners(
  poolId: string
): Promise<UserRoundWins[]> {
  const { data } = await api.get(`/pools/${poolId}/round-winners`);
  return data.winners;
}

export async function computePoolRoundWinners(
  poolId: string
): Promise<{ message: string; winners: UserRoundWins[] }> {
  const { data } = await api.post(`/pools/${poolId}/round-winners/compute`);
  return data;
}
