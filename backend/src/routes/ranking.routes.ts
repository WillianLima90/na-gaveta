// ============================================================
// Na Gaveta — Rotas de Ranking v4
// Routers separados para cada prefixo de URL:
//   poolRankingRouter      → montado em /api/pools/:id/ranking
//   poolRoundsRouter       → montado em /api/pools/:id/rounds
//   poolUsersRouter        → montado em /api/pools/:id/users
//   poolRoundWinnersRouter → montado em /api/pools/:id/round-winners
// mergeParams: true permite acessar :id do pool pai.
// ============================================================

import { Router } from 'express';
import {
  getPoolRanking,
  getRoundRankingHandler,
  getRoundHighlightsHandler,
  getUserHistoryHandler,
  getUserSummaryHandler,
  getPoolRoundWinnersHandler,
  computeRoundWinnersHandler,
} from '../controllers/ranking.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';

// GET /api/pools/:id/ranking
export const poolRankingRouter = Router({ mergeParams: true });
poolRankingRouter.get('/', optionalAuthenticate, getPoolRanking);

// GET /api/pools/:id/rounds/:roundId/ranking
// GET /api/pools/:id/rounds/:roundId/highlights
export const poolRoundsRouter = Router({ mergeParams: true });
poolRoundsRouter.get('/:roundId/ranking', optionalAuthenticate, getRoundRankingHandler);
poolRoundsRouter.get('/:roundId/highlights', optionalAuthenticate, getRoundHighlightsHandler);

// GET /api/pools/:id/users/:userId/history
// GET /api/pools/:id/users/:userId/summary
export const poolUsersRouter = Router({ mergeParams: true });
poolUsersRouter.get('/:userId/history', authenticate, getUserHistoryHandler);
poolUsersRouter.get('/:userId/summary', authenticate, getUserSummaryHandler);

// GET  /api/pools/:id/round-winners         → buscar vencedores com escudos
// POST /api/pools/:id/round-winners/compute → calcular e persistir (apenas dono)
export const poolRoundWinnersRouter = Router({ mergeParams: true });
poolRoundWinnersRouter.get('/', optionalAuthenticate, getPoolRoundWinnersHandler);
poolRoundWinnersRouter.post('/compute', authenticate, computeRoundWinnersHandler);
