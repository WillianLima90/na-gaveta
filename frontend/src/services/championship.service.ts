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

export async function getChampionshipStandings(championshipId: string): Promise<ChampionshipStanding[]> {
  const { data } = await api.get(`/championships/${championshipId}/standings`);
  return data.standings;
}
