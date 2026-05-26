import axios from 'axios';
import prisma from '../utils/prisma';

const API_URL = 'https://api.football-data.org/v4/competitions/BSA/matches';
const MATCH_API_URL = 'https://api.football-data.org/v4/matches';
const LOCAL_API = 'http://localhost:3001/api';

function normalizeName(name: string | null | undefined): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getFootballDataApiKey() {
  const apiKey = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY || '';
  if (!apiKey) throw new Error('FOOTBALL_API_KEY/FOOTBALL_DATA_API_KEY ausente no .env');
  return apiKey;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchApiMatches(retry = true) {
  const apiKey = getFootballDataApiKey();

  try {
    const res = await axios.get(API_URL, {
      headers: { 'X-Auth-Token': apiKey },
      timeout: 15000,
    });

    return res.data.matches || [];
  } catch (err: any) {
    if (retry && err?.response?.status === 429) {
      const waitSeconds = Number(err?.response?.headers?.['x-requestcounter-reset'] || 3);

      console.log(`[SYNC] Rate limit atingido. Aguardando ${waitSeconds}s...`);

      await sleep(waitSeconds * 1000);

      return fetchApiMatches(false);
    }

    throw err;
  }
}

async function fetchApiMatchById(externalMatchId: number) {
  const apiKey = getFootballDataApiKey();

  const res = await axios.get(`${MATCH_API_URL}/${externalMatchId}`, {
    headers: { 'X-Auth-Token': apiKey },
    timeout: 15000,
  });

  return res.data;
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
      apiStatus: true,
      apiLastUpdated: true,
      isManualOverride: true,
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
      apiStatus: true,
      apiLastUpdated: true,
      isManualOverride: true,
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
      data: {
        externalMatchId,
        apiStatus: apiMatch.status,
        apiLastUpdated: apiMatch.lastUpdated ? new Date(apiMatch.lastUpdated) : null,
      },
    });

    return {
      ...matched,
      externalMatchId,
    };
  }

  return matched;
}

async function pushResult(localMatchId: string, apiMatch: any, adminToken: string, status: 'LIVE' | 'FINISHED') {
  return axios.patch(
    `${LOCAL_API}/matches/${localMatchId}/result`,
    {
      homeScore: apiMatch.score?.fullTime?.home ?? 0,
      awayScore: apiMatch.score?.fullTime?.away ?? 0,
      status,
      isManualOverride: false,
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
  const syncable = apiMatches.filter(
    (m: any) =>
      ['FINISHED', 'IN_PLAY', 'PAUSED'].includes(m.status) &&
      typeof m.score?.fullTime?.home === 'number' &&
      typeof m.score?.fullTime?.away === 'number'
  );

  let matched = 0;
  let updated = 0;
  let skipped = 0;
  const logs: string[] = [];

  for (const apiMatch of syncable) {
    const localMatch = await findLocalMatch(apiMatch);

    if (!localMatch) {
      const msg = `SKIP no-match | ${apiMatch.homeTeam?.name} x ${apiMatch.awayTeam?.name} | ${apiMatch.utcDate}`;
      logs.push(msg);
      skipped += 1;
      continue;
    }

    matched += 1;

    // 🔒 PROTEÇÃO: não sobrescrever resultado manual
    if (localMatch.isManualOverride) {
      logs.push(`LOCKED (manual override) | ${localMatch.homeTeam} x ${localMatch.awayTeam}`);
      continue;
    }

    let sourceMatch = apiMatch;

    const shouldRefetchFinal =
      sourceMatch.status === 'FINISHED' &&
      localMatch.externalMatchId &&
      (
        localMatch.status !== 'FINISHED' ||
        localMatch.homeScore !== sourceMatch.score.fullTime.home ||
        localMatch.awayScore !== sourceMatch.score.fullTime.away
      );

    if (shouldRefetchFinal) {
      try {
        sourceMatch = await fetchApiMatchById(localMatch.externalMatchId!);
        logs.push(`REFETCH final | ${localMatch.homeTeam} x ${localMatch.awayTeam}`);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'erro desconhecido';
        logs.push(`REFETCH failed | ${localMatch.homeTeam} x ${localMatch.awayTeam} | ${msg}`);
      }
    }

    const apiStatus = sourceMatch.status;
    const apiLastUpdated = sourceMatch.lastUpdated ? new Date(sourceMatch.lastUpdated) : null;

    // Regra anti-regressão:
    // se local já está FINISHED, nunca volta para LIVE por inconsistência/cache da API.
    const targetStatus =
      localMatch.status === 'FINISHED'
        ? 'FINISHED'
        : apiStatus === 'FINISHED'
          ? 'FINISHED'
          : 'LIVE';

    const sameScore =
      localMatch.homeScore === sourceMatch.score.fullTime.home &&
      localMatch.awayScore === sourceMatch.score.fullTime.away &&
      localMatch.status === targetStatus;

    // Segurança:
    // se API já finalizou mas jogo local ainda está LIVE,
    // força atualização para evitar jogo travado.
    const needsFinalization =
      apiMatch.status === 'FINISHED' &&
      localMatch.status !== 'FINISHED';

    if (sameScore && !needsFinalization) {
      logs.push(`OK unchanged | ${localMatch.homeTeam} x ${localMatch.awayTeam}`);
      continue;
    }

    try {
      await prisma.match.update({
        where: { id: localMatch.id },
        data: {
          apiStatus,
          apiLastUpdated,
        },
      });

      const res = await pushResult(localMatch.id, sourceMatch, adminToken, targetStatus);
      logs.push(`UPDATED | ${localMatch.homeTeam} x ${localMatch.awayTeam} | ${res.data.message}`);
      updated += 1;
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'erro desconhecido';
      logs.push(`ERROR | ${localMatch.homeTeam} x ${localMatch.awayTeam} | ${msg}`);
    }
  }

  return {
    finishedApi: syncable.length,
    matchedLocal: matched,
    updated,
    skipped,
    logs,
  };
}
