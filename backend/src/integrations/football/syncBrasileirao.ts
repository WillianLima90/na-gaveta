import prisma from '../../utils/prisma';
import { MatchStatus } from '@prisma/client';
import {
  getCompetitionByCode,
  getCompetitionMatches,
  type ExternalMatch,
} from './footballDataProvider';

function mapStatus(status: string): MatchStatus {
  if (status === 'FINISHED') return MatchStatus.FINISHED;
  if (status === 'IN_PLAY' || status === 'PAUSED') return MatchStatus.LIVE;
  if (status === 'POSTPONED') return MatchStatus.POSTPONED;
  if (status === 'CANCELLED') return MatchStatus.CANCELLED;
  return MatchStatus.SCHEDULED;
}

function roundName(matchday: number) {
  return `Rodada ${matchday}`;
}

export async function syncBrasileiraoFromFootballData() {
  const competitionCode = 'BSA';

  const competition = await getCompetitionByCode(competitionCode);
  if (!competition) {
    throw new Error('Competição BSA não encontrada na football-data.');
  }

  const matches = await getCompetitionMatches(competitionCode);

  let championship = await prisma.championship.findFirst({
    where: {
      slug: 'brasileirao-serie-a-real',
    },
  });

  if (!championship) {
    championship = await prisma.championship.create({
      data: {
        name: competition.name || 'Brasileirão Série A',
        slug: 'brasileirao-serie-a-real',
        season: competition.currentSeason?.startDate?.slice(0, 4) || '2026',
        country: competition.area?.name || 'Brasil',
        isActive: true,
        startDate: competition.currentSeason?.startDate
          ? new Date(competition.currentSeason.startDate)
          : new Date(),
        endDate: competition.currentSeason?.endDate
          ? new Date(competition.currentSeason.endDate)
          : new Date(),
      },
    });
  }

  const roundsMap = new Map<number, string>();

  const validMatches = matches.filter(
    (match) =>
      match.matchday &&
      match.homeTeam?.name &&
      match.awayTeam?.name &&
      match.utcDate
  );

  for (const match of validMatches) {
    const matchday = match.matchday as number;

    if (!roundsMap.has(matchday)) {
      let round = await prisma.round.findFirst({
        where: {
          championshipId: championship.id,
          number: matchday,
        },
      });

      if (!round) {
        round = await prisma.round.create({
          data: {
            championshipId: championship.id,
            number: matchday,
            name: roundName(matchday),
            startDate: new Date(match.utcDate),
            endDate: new Date(match.utcDate),
            isOpen: true,
          },
        });
      }

      roundsMap.set(matchday, round.id);
    }
  }

  for (const match of validMatches) {
    const roundId = roundsMap.get(match.matchday as number);
    if (!roundId) continue;

    const existing = await prisma.match.findFirst({
      where: {
        externalMatchId: match.id,
      },
    });

    const data = {
      roundId,
      homeTeam: match.homeTeam?.name || '',
      awayTeam: match.awayTeam?.name || '',
      homeScore: match.score?.fullTime?.home ?? null,
      awayScore: match.score?.fullTime?.away ?? null,
      externalMatchId: match.id,
      apiStatus: match.status,
      apiLastUpdated: new Date(),
      status: mapStatus(match.status),
      isJoker: false,
      matchDate: new Date(match.utcDate),
      venue: null as string | null,
    };

    if (!existing) {
      await prisma.match.create({ data });
    } else {
      await prisma.match.update({
        where: { id: existing.id },
        data,
      });
    }
  }

  return {
    championshipId: championship.id,
    rounds: roundsMap.size,
    matches: validMatches.length,
  };
}
