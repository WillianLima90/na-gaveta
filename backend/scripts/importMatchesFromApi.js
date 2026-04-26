require('dotenv').config();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const API_URL = 'https://api.football-data.org/v4/competitions/BSA/matches';
const API_KEY = process.env.FOOTBALL_API_KEY;
const CHAMPIONSHIP_ID = 'bdc291fb-5642-4e39-920c-a1f38423e3d3';

async function run() {
  if (!API_KEY) {
    throw new Error('FOOTBALL_API_KEY ausente');
  }

  const res = await axios.get(API_URL, {
    headers: { 'X-Auth-Token': API_KEY }
  });

  const matches = res.data.matches || [];

  const allMatches = matches;

  let created = 0;

  for (const m of allMatches) {
    const exists = await prisma.match.findFirst({
      where: { externalMatchId: m.id }
    });

    if (exists) continue;

    // pegar rodada pelo matchday
    const round = await prisma.round.upsert({
      where: {
        championshipId_number: {
          championshipId: CHAMPIONSHIP_ID,
          number: m.matchday
        }
      },
      update: {},
      create: {
        championshipId: CHAMPIONSHIP_ID,
        number: m.matchday,
        name: `Rodada ${m.matchday}`,
        startDate: new Date(m.utcDate),
        endDate: new Date(m.utcDate)
      }
    });

    if (!round) continue;

    await prisma.match.create({
      data: {
        roundId: round.id,
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        status: m.status === 'FINISHED' ? 'FINISHED' : (m.status === 'IN_PLAY' ? 'LIVE' : 'SCHEDULED'),
        matchDate: new Date(m.utcDate),
        homeScore: m.score?.fullTime?.home ?? null,
        awayScore: m.score?.fullTime?.away ?? null,
        externalMatchId: m.id
      }
    });

    created++;
  }

  console.log('Criados:', created);
}

run()
  .catch(err => {
    console.error(err.message);
  })
  .finally(() => prisma.$disconnect());
