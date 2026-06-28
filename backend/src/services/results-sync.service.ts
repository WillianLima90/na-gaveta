import axios from 'axios';
import prisma from '../utils/prisma';

const API_COMPETITIONS = ['BSA', 'WC'];
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
  const allMatches: any[] = [];

  for (const competitionCode of API_COMPETITIONS) {
    const url = `https://api.football-data.org/v4/competitions/${competitionCode}/matches`;

    try {
      const res = await axios.get(url, {
        headers: { 'X-Auth-Token': apiKey },
        timeout: 15000,
      });

      allMatches.push(...(res.data.matches || []));
    } catch (err: any) {
      if (retry && err?.response?.status === 429) {
        const waitSeconds = Number(err?.response?.headers?.['x-requestcounter-reset'] || 3);

        console.log(`[SYNC] Rate limit atingido. Aguardando ${waitSeconds}s...`);

        await sleep(waitSeconds * 1000);

        return fetchApiMatches(false);
      }

      const msg = err?.response?.data?.message || err?.message || 'erro desconhecido';
      console.log(`[SYNC] Falha ao buscar ${competitionCode}: ${msg}`);
      continue;
    }
  }

  return allMatches;
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
      updatedAt: true,
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
      updatedAt: true,
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
  const homeScore = apiMatch.score?.fullTime?.home;
  const awayScore = apiMatch.score?.fullTime?.away;

  if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
    throw new Error(`Placar inválido recebido da API: ${homeScore}-${awayScore}`);
  }

  return axios.patch(
    `${LOCAL_API}/matches/${localMatchId}/result`,
    {
      homeScore,
      awayScore,
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
  const syncable = apiMatches.filter((m: any) => {
    if (!['FINISHED', 'IN_PLAY', 'PAUSED', 'TIMED', 'SCHEDULED'].includes(m.status)) return false;
    if (m.status === 'TIMED' || m.status === 'SCHEDULED') return true;
    if (m.status === 'FINISHED') return true;

    return (
      typeof m.score?.fullTime?.home === 'number' &&
      typeof m.score?.fullTime?.away === 'number'
    );
  });

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

    // 🔒 PROTEÇÃO: manual override não deve retroceder placar,
    // mas pode aceitar avanço seguro da API.
    if (localMatch.isManualOverride) {
      const apiHome =
        apiMatch.status === 'FINISHED'
          ? apiMatch.score.fullTime.home
          : apiMatch.score.fullTime.home ?? apiMatch.score.halfTime.home;
      const apiAway =
        apiMatch.status === 'FINISHED'
          ? apiMatch.score.fullTime.away
          : apiMatch.score.fullTime.away ?? apiMatch.score.halfTime.away;

      const localHome = localMatch.homeScore ?? 0;
      const localAway = localMatch.awayScore ?? 0;
      const apiHasScore = typeof apiHome === 'number' && typeof apiAway === 'number';
      const apiTotal = apiHasScore ? apiHome + apiAway : -1;
      const localTotal = localHome + localAway;

      const isSafeProgress =
        apiHasScore &&
        (
          apiTotal > localTotal ||
          (
            apiTotal === localTotal &&
            apiMatch.status === 'FINISHED' &&
            localMatch.status !== 'FINISHED'
          )
        );

      if (!isSafeProgress) {
        logs.push(`LOCKED (manual override) | ${localMatch.homeTeam} x ${localMatch.awayTeam}`);
        continue;
      }

      logs.push(`UNLOCK safe API progress | ${localMatch.homeTeam} x ${localMatch.awayTeam}`);
    }

    let sourceMatch = apiMatch;

    const shouldRefetch =
      localMatch.externalMatchId &&
      (
        (
          sourceMatch.status === 'FINISHED' &&
          (
            localMatch.status !== 'FINISHED' ||
            localMatch.homeScore !== sourceMatch.score.fullTime.home ||
            localMatch.awayScore !== sourceMatch.score.fullTime.away
          )
        ) ||
        (
          ['IN_PLAY', 'PAUSED'].includes(sourceMatch.status) &&
          localMatch.status === 'LIVE'
        )
      );

    if (shouldRefetch) {
      try {
        sourceMatch = await fetchApiMatchById(localMatch.externalMatchId!);
        logs.push(`REFETCH match | ${localMatch.homeTeam} x ${localMatch.awayTeam}`);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'erro desconhecido';
        logs.push(`REFETCH failed | ${localMatch.homeTeam} x ${localMatch.awayTeam} | ${msg}`);
      }
    }

    if (
      sourceMatch.status === 'FINISHED' &&
      (
        typeof sourceMatch.score?.fullTime?.home !== 'number' ||
        typeof sourceMatch.score?.fullTime?.away !== 'number'
      ) &&
      typeof localMatch.homeScore === 'number' &&
      typeof localMatch.awayScore === 'number'
    ) {
      sourceMatch = {
        ...sourceMatch,
        score: {
          ...sourceMatch.score,
          fullTime: {
            home: localMatch.homeScore,
            away: localMatch.awayScore,
          },
        },
      };
      logs.push(`FINAL with local score | ${localMatch.homeTeam} x ${localMatch.awayTeam}`);
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

    const sameTeams =
      localMatch.homeTeam === sourceMatch.homeTeam?.name &&
      localMatch.awayTeam === sourceMatch.awayTeam?.name;

    const sameScore =
      localMatch.homeScore === sourceMatch.score?.fullTime?.home &&
      localMatch.awayScore === sourceMatch.score?.fullTime?.away &&
      localMatch.status === targetStatus &&
      sameTeams;

    // Segurança:
    // se API já finalizou mas jogo local ainda está LIVE,
    // força atualização para evitar jogo travado.
    const needsFinalization =
      apiMatch.status === 'FINISHED' &&
      localMatch.status !== 'FINISHED';

    const localGoals = (localMatch.homeScore ?? 0) + (localMatch.awayScore ?? 0);
    const apiGoals = (sourceMatch.score?.fullTime?.home ?? 0) + (sourceMatch.score?.fullTime?.away ?? 0);
    const apiIsOlderThanLocal =
      Boolean(apiLastUpdated) &&
      localMatch.updatedAt &&
      apiLastUpdated!.getTime() < localMatch.updatedAt.getTime();

    const isStaleLiveRegression =
      localMatch.status === 'LIVE' &&
      targetStatus === 'LIVE' &&
      apiIsOlderThanLocal &&
      apiGoals < localGoals;

    if (isStaleLiveRegression) {
      logs.push(`SKIP stale live regression | ${localMatch.homeTeam} x ${localMatch.awayTeam} | local ${localMatch.homeScore ?? 0}-${localMatch.awayScore ?? 0} api ${sourceMatch.score.fullTime.home}-${sourceMatch.score.fullTime.away}`);
      continue;
    }

    if (sameScore && !needsFinalization) {
      logs.push(`OK unchanged | ${localMatch.homeTeam} x ${localMatch.awayTeam}`);
      continue;
    }

    try {
      await prisma.match.update({
        where: { id: localMatch.id },
        data: {
          homeTeam: sourceMatch.homeTeam?.name ?? localMatch.homeTeam,
          awayTeam: sourceMatch.awayTeam?.name ?? localMatch.awayTeam,
          homeTeamTla: sourceMatch.homeTeam?.tla ?? null,
          awayTeamTla: sourceMatch.awayTeam?.tla ?? null,
          homeTeamCrest: sourceMatch.homeTeam?.crest ?? null,
          awayTeamCrest: sourceMatch.awayTeam?.crest ?? null,
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
