require('dotenv').config();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const API_URL = 'https://api.football-data.org/v4/competitions/WC/matches';
const API_KEY = process.env.FOOTBALL_API_KEY || process.env.FOOTBALL_DATA_API_KEY;
const CHAMPIONSHIP_SLUG = 'copa-do-mundo-fifa-2026';

function mapStatus(apiStatus) {
  if (apiStatus === 'FINISHED') return 'FINISHED';
  if (apiStatus === 'IN_PLAY' || apiStatus === 'PAUSED') return 'LIVE';
  return 'SCHEDULED';
}

function getRoundNumber(match) {
  if (match.matchday) return match.matchday;

  const stageOrder = {
    LAST_16: 101,
    QUARTER_FINALS: 102,
    SEMI_FINALS: 103,
    THIRD_PLACE: 104,
    FINAL: 105,
  };

  return stageOrder[match.stage] || 999;
}

function getRoundName(match) {
  if (match.stage === 'GROUP_STAGE') {
    return `Rodada ${match.matchday}`;
  }

  const stageNames = {
    LAST_16: 'Oitavas de final',
    QUARTER_FINALS: 'Quartas de final',
    SEMI_FINALS: 'Semifinais',
    THIRD_PLACE: 'Disputa de 3º lugar',
    FINAL: 'Final',
  };

  return stageNames[match.stage] || match.stage || 'Fase eliminatória';
}

async function run() {
  if (!API_KEY) {
    throw new Error('FOOTBALL_API_KEY ausente');
  }

  const championship = await prisma.championship.findUnique({
    where: { slug: CHAMPIONSHIP_SLUG },
    select: { id: true, name: true, slug: true },
  });

  if (!championship) {
    throw new Error(`Campeonato não encontrado: ${CHAMPIONSHIP_SLUG}`);
  }

  const res = await axios.get(API_URL, {
    headers: { 'X-Auth-Token': API_KEY },
  });

  const matches = res.data.matches || [];

  let created = 0;
  let updated = 0;
  let skippedWithoutTeams = 0;

  for (const m of matches) {
    if (!m.homeTeam?.name || !m.awayTeam?.name) {
      skippedWithoutTeams++;
      continue;
    }

    const roundNumber = getRoundNumber(m);
    const roundName = getRoundName(m);
    const matchDate = new Date(m.utcDate);

    const round = await prisma.round.upsert({
      where: {
        championshipId_number: {
          championshipId: championship.id,
          number: roundNumber,
        },
      },
      update: {
        name: roundName,
        startDate: matchDate,
        endDate: matchDate,
      },
      create: {
        championshipId: championship.id,
        number: roundNumber,
        name: roundName,
        startDate: matchDate,
        endDate: matchDate,
      },
    });

    const data = {
      roundId: round.id,
      homeTeam: m.homeTeam.name,
      awayTeam: m.awayTeam.name,
      status: mapStatus(m.status),
      matchDate,
      homeScore: m.score?.fullTime?.home ?? null,
      awayScore: m.score?.fullTime?.away ?? null,
      externalMatchId: m.id,
      apiStatus: m.status,
      apiLastUpdated: m.lastUpdated ? new Date(m.lastUpdated) : null,
    };

    const existing = await prisma.match.findUnique({
      where: { externalMatchId: m.id },
      select: { id: true, isManualOverride: true },
    });

    if (existing) {
      if (!existing.isManualOverride) {
        await prisma.match.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      }
      continue;
    }

    await prisma.match.create({ data });
    created++;
  }

  console.log(JSON.stringify({
    championship: championship.name,
    apiMatches: matches.length,
    created,
    updated,
    skippedWithoutTeams,
  }, null, 2));
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
