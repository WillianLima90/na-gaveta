require('dotenv').config();
require('ts-node/register/transpile-only');

const prisma = require('../src/utils/prisma').default;
const {
  recalculatePredictionsForMatch,
} = require('../src/services/scoring.service');
const {
  computeAndSaveRoundWinners,
} = require('../src/services/statistics.service');

const shouldExecute = process.env.EXECUTE_RECALCULATION === 'YES';

async function main() {
  const predictionsByMatch = await prisma.prediction.findMany({
    where: {
      match: {
        status: 'FINISHED',
        homeScore: { not: null },
        awayScore: { not: null },
      },
    },
    select: {
      matchId: true,
      poolId: true,
    },
    distinct: ['matchId', 'poolId'],
  });

  const matchIds = [...new Set(predictionsByMatch.map((item) => item.matchId))];
  const poolIds = [...new Set(predictionsByMatch.map((item) => item.poolId))];

  console.log('=== RECÁLCULO DE PONTUAÇÃO ===');
  console.log(`Partidas finalizadas com palpites: ${matchIds.length}`);
  console.log(`Bolões afetados: ${poolIds.length}`);

  if (!shouldExecute) {
    console.log('');
    console.log('MODO DIAGNÓSTICO: nenhuma alteração foi realizada.');
    console.log(
      'Para executar, use: EXECUTE_RECALCULATION=YES node scripts/recalculate-heart-team-and-round-winners.js'
    );
    return;
  }

  console.log('');
  console.log('Recalculando palpites das partidas finalizadas...');

  for (const [index, matchId] of matchIds.entries()) {
    await recalculatePredictionsForMatch(matchId);
    console.log(`Partida ${index + 1}/${matchIds.length} recalculada`);
  }

  console.log('');
  console.log('Reconstruindo os títulos de Melhor da Rodada...');

  for (const [index, poolId] of poolIds.entries()) {
    await computeAndSaveRoundWinners(poolId);
    console.log(`Bolão ${index + 1}/${poolIds.length} reconstruído`);
  }

  console.log('');
  console.log('OK: pontuações e títulos recalculados com sucesso.');
}

main()
  .catch((error) => {
    console.error('ERRO NO RECÁLCULO:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
