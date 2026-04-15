// ============================================================
// Na Gaveta — Rotas de Palpites
// POST /api/predictions                              → criar/atualizar palpite (autenticado)
// GET  /api/predictions/me                           → meus palpites (autenticado)
// GET  /api/predictions/pool/:poolId                 → palpites de um bolão (autenticado)
// GET  /api/predictions/match/:matchId/pool/:poolId  → palpites por jogo após fechamento (autenticado)
// ============================================================

import { Router } from 'express';
import {
  upsertPrediction,
  myPredictions,
  poolPredictions,
  matchPredictions,
} from '../controllers/prediction.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Todas as rotas de palpite requerem autenticação
router.use(authenticate);

router.post('/', upsertPrediction);
router.get('/me', myPredictions);
router.get('/pool/:poolId', poolPredictions);
router.get('/match/:matchId/pool/:poolId', matchPredictions);

export default router;
