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
