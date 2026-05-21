import { syncBrasileiraoFromFootballData } from '../src/integrations/football/syncBrasileirao';

async function run() {
  console.log('🔄 Sync Brasileirão iniciando...\n');

  const result = await syncBrasileiraoFromFootballData();

  console.log('\n✅ Sync concluído:');
  console.log(result);
}

run().catch((err) => {
  console.error('❌ Erro no sync:', err);
  process.exit(1);
});
