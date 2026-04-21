import axios from 'axios';
import prisma from '../utils/prisma';

const API_URL = 'https://api.football-data.org/v4/competitions/BSA/matches';
const LOCAL_API = 'http://localhost:3001/api';

function normalizeName(name: string | null | undefined): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function fetchApiMatches() {
  const apiKey = process.env.FOOTBALL_API_KEY || '';
  if (!apiKey) throw new Error('FOOTBALL_API_KEY ausente no .env');

  const res = await axios.get(API_URL, {
    headers: { 'X-Auth-Token': apiKey },
    timeout: 15000,
  });

  return res.data.matches || [];
}

async function findLocalMatch(apiMatch: any) {
  const externalMatchId = Number(apiMatch.id);

  const byExternalId = await prisma.match.findUnique({
    where: { externalMatchId },
    select: {
      id: true,
      homeTeam: true,
      awayTeam: true,
      homeScore: true,
      awayScore: true,
      status: true,
      externalMatchId: true,
    },
  });

  if (byExternalId) {
    return byExternalId;
  }

  const utcDate = new Date(apiMatch.utcDate);

  const candidates = await prisma.match.findMany({
    where: { matchDate: utcDate },
    select: {
      id: true,
      homeTeam: true,
      awayTeam: true,
      homeScore: true,
      awayScore: true,
      status: true,
      externalMatchId: true,
    },
  });

  const matched = candidates.find((m) =>
    normalizeName(m.homeTeam) === normalizeName(apiMatch.homeTeam?.name) &&
    normalizeName(m.awayTeam) === normalizeName(apiMatch.awayTeam?.name)
  );

  if (!matched) return null;

  if (!matched.externalMatchId) {
    await prisma.match.update({
      where: { id: matched.id },
      data: { externalMatchId },
    });

    return {
      ...matched,
      externalMatchId,
    };
  }

  return matched;
}

async function pushResult(localMatchId: string, apiMatch: any, adminToken: string) {
  return axios.patch(
    `${LOCAL_API}/matches/${localMatchId}/result`,
    {
      homeScore: apiMatch.score?.fullTime?.home ?? 0,
      awayScore: apiMatch.score?.fullTime?.away ?? 0,
      status: 'FINISHED',
    },
    {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      timeout: 15000,
    }
  );
}

export interface SyncResultsSummary {
  finishedApi: number;
  matchedLocal: number;
  updated: number;
  skipped: number;
  logs: string[];
}

export async function syncResultsFromApi(adminToken: string): Promise<SyncResultsSummary> {
  if (!adminToken) {
    throw new Error('Token ADMIN ausente para sincronização');
  }

  const apiMatches = await fetchApiMatches();
  const finished = apiMatches.filter(
    (m: any) =>
      m.status === 'FINISHED' &&
      typeof m.score?.fullTime?.home === 'number' &&
      typeof m.score?.fullTime?.away === 'number'
  );

  let matched = 0;
  let updated = 0;
  let skipped = 0;
  const logs: string[] = [];

  for (const apiMatch of finished) {
    const localMatch = await findLocalMatch(apiMatch);

    if (!localMatch) {
      const msg = `SKIP no-match | ${apiMatch.homeTeam?.name} x ${apiMatch.awayTeam?.name} | ${apiMatch.utcDate}`;
      logs.push(msg);
      skipped += 1;
      continue;
    }

    matched += 1;

    const sameScore =
      localMatch.homeScore === apiMatch.score.fullTime.home &&
      localMatch.awayScore === apiMatch.score.fullTime.away &&
      localMatch.status === 'FINISHED';

    if (sameScore) {
      logs.push(`OK unchanged | ${localMatch.homeTeam} x ${localMatch.awayTeam}`);
      continue;
    }

    try {
      const res = await pushResult(localMatch.id, apiMatch, adminToken);
      logs.push(`UPDATED | ${localMatch.homeTeam} x ${localMatch.awayTeam} | ${res.data.message}`);
      updated += 1;
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'erro desconhecido';
      logs.push(`ERROR | ${localMatch.homeTeam} x ${localMatch.awayTeam} | ${msg}`);
    }
  }

  return {
    finishedApi: finished.length,
    matchedLocal: matched,
    updated,
    skipped,
    logs,
  };
}
