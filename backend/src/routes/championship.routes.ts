// ============================================================
// Na Gaveta — Rotas de Campeonatos
// GET /api/championships       → lista campeonatos ativos
// GET /api/championships/:id   → detalhe com rodadas e partidas
// ============================================================

import { Router } from 'express';
import { listChampionships, getChampionship } from '../controllers/championship.controller';

const router = Router();

router.get('/', listChampionships);
router.get('/:id', getChampionship);

export default router;
