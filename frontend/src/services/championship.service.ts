// ============================================================
// Na Gaveta — Serviço de Campeonatos
// ============================================================

import api from './api';

export interface Championship {
  id: string;
  name: string;
  slug: string;
  season: string;
  country?: string;
  logoUrl?: string;
  isActive: boolean;
}

export async function listChampionships(): Promise<Championship[]> {
  const { data } = await api.get('/championships');
  return data.championships;
}

export interface ChampionshipStanding {
  position: number;
  team: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface ChampionshipStandingGroup {
  group: string;
  table: ChampionshipStanding[];
}

export interface ChampionshipStandingsResponse {
  type: 'TABLE' | 'GROUPS';
  standings: ChampionshipStanding[] | ChampionshipStandingGroup[];
}

export async function getChampionshipStandings(championshipId: string): Promise<ChampionshipStandingsResponse> {
  const { data } = await api.get(`/championships/${championshipId}/standings`);
  return {
    type: data.type ?? 'TABLE',
    standings: data.standings ?? [],
  };
}
