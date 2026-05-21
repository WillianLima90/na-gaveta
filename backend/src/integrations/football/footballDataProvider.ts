import 'dotenv/config';

export interface ExternalCompetition {
  id: number;
  code: string | null;
  name: string;
  area?: { name?: string };
  currentSeason?: {
    id?: number;
    startDate?: string;
    endDate?: string;
    currentMatchday?: number | null;
  };
}

export interface ExternalMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number | null;
  stage?: string | null;
  homeTeam?: { name?: string | null };
  awayTeam?: { name?: string | null };
  score?: {
    fullTime?: { home?: number | null; away?: number | null };
  };
}

const BASE_URL = 'https://api.football-data.org/v4';

function getApiKey(): string {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    throw new Error('FOOTBALL_DATA_API_KEY não definido no ambiente.');
  }
  return key;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'X-Auth-Token': getApiKey(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`football-data ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function getCompetitionByCode(code: string): Promise<ExternalCompetition | null> {
  const data = await apiGet<{ competitions: ExternalCompetition[] }>('/competitions');
  return data.competitions.find((item) => item.code === code) ?? null;
}

export async function getCompetitionMatches(code: string): Promise<ExternalMatch[]> {
  const data = await apiGet<{ matches: ExternalMatch[] }>(`/competitions/${code}/matches`);
  return data.matches ?? [];
}
