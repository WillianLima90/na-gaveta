import 'dotenv/config';
import app from './app';
import { startReminderCron, startResultsSyncCron } from './services/cron.service';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🏆 Na Gaveta API rodando na porta ${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  
  startReminderCron();
  startResultsSyncCron();
});
