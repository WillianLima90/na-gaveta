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
    LAST_32: 4,
    LAST_16: 5,
    QUARTER_FINALS: 6,
    SEMI_FINALS: 7,
    THIRD_PLACE: 8,
    FINAL: 9,
  };

  return stageOrder[match.stage] || 999;
}

function getRoundName(match) {
  if (match.stage === 'GROUP_STAGE') {
    return `Rodada ${match.matchday}`;
  }

  const stageNames = {
    LAST_32: 'Segunda fase',
    LAST_16: 'Oitavas de final',
    QUARTER_FINALS: 'Quartas de final',
    SEMI_FINALS: 'Semifinais',
    THIRD_PLACE: 'Disputa de 3º lugar',
    FINAL: 'Final',
  };

  return stageNames[match.stage] || match.stage || 'Fase eliminatória';
}

function buildPlaceholderLabels(matches) {
  const labels = new Map();

  const stages = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];

  for (const stage of stages) {
    const stageMatches = matches
      .filter((m) => m.stage === stage)
      .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

    stageMatches.forEach((m, index) => {
      const n = index + 1;

      if (stage === 'LAST_32') {
        const last32Pairs = [
          ['1º E', '3º ABCDF'],
          ['1º I', '3º CDFGH'],
          ['2º A', '2º B'],
          ['1º F', '2º C'],
          ['2º K', '2º L'],
          ['1º H', '2º J'],
          ['1º D', '3º BEFIJ'],
          ['1º G', '3º AEHIJ'],
          ['1º C', '2º F'],
          ['2º E', '2º I'],
          ['1º A', '3º CEFHI'],
          ['1º L', '3º EHIJK'],
          ['1º J', '2º H'],
          ['2º D', '2º G'],
          ['1º B', '3º EFGIJ'],
          ['1º K', '3º DEIJL'],
        ];

        const pair = last32Pairs[index] || [`Classificado ${n * 2 - 1}`, `Classificado ${n * 2}`];

        labels.set(m.id, {
          homeTeam: pair[0],
          awayTeam: pair[1],
        });
      }

      if (stage === 'LAST_16') {
        labels.set(m.id, {
          homeTeam: `Vencedor Segunda Fase ${n * 2 - 1}`,
          awayTeam: `Vencedor Segunda Fase ${n * 2}`,
        });
      }

      if (stage === 'QUARTER_FINALS') {
        labels.set(m.id, {
          homeTeam: `Vencedor Oitavas ${n * 2 - 1}`,
          awayTeam: `Vencedor Oitavas ${n * 2}`,
        });
      }

      if (stage === 'SEMI_FINALS') {
        labels.set(m.id, {
          homeTeam: `Vencedor Quartas ${n * 2 - 1}`,
          awayTeam: `Vencedor Quartas ${n * 2}`,
        });
      }

      if (stage === 'THIRD_PLACE') {
        labels.set(m.id, {
          homeTeam: 'Perdedor Semifinal 1',
          awayTeam: 'Perdedor Semifinal 2',
        });
      }

      if (stage === 'FINAL') {
        labels.set(m.id, {
          homeTeam: 'Vencedor Semifinal 1',
          awayTeam: 'Vencedor Semifinal 2',
        });
      }
    });
  }

  return labels;
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
  const placeholderLabels = buildPlaceholderLabels(matches);

  let created = 0;
  let updated = 0;
  let placeholderMatches = 0;

  for (const m of matches) {
    const hasBothTeams = Boolean(m.homeTeam?.name && m.awayTeam?.name);
    if (!hasBothTeams) placeholderMatches++;

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
      homeTeam: m.homeTeam?.name || placeholderLabels.get(m.id)?.homeTeam || 'A definir',
      awayTeam: m.awayTeam?.name || placeholderLabels.get(m.id)?.awayTeam || 'A definir',
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
    placeholderMatches,
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
