import { Router } from 'express';
import { runInternalResultsSync } from '../controllers/internal-sync.controller';

const router = Router();

router.post('/sync-results', runInternalResultsSync);

export default router;
