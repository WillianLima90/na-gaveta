// ============================================================
// Na Gaveta — Rotas de Partidas
// GET   /api/matches               → listar partidas
// PATCH /api/matches/:id/result    → registrar resultado (dispara motor)
// PATCH /api/matches/:id/joker     → marcar/desmarcar coringa
// GET   /api/pools/:id/matches     → partidas do bolão com palpites
// ============================================================

import { Router } from 'express';
import {
  listMatches,
  getPoolMatches,
  setMatchResult,
  toggleJoker,
} from '../controllers/match.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';

const router = Router();

// Listar partidas — público
router.get('/', listMatches);

// Registrar resultado real de uma partida — requer auth (admin em produção)
// Por ora, qualquer usuário autenticado pode registrar (para testes)
router.patch('/:id/result', authenticate, setMatchResult);

// Marcar/desmarcar coringa — requer auth
router.patch('/:id/joker', authenticate, toggleJoker);

export default router;

// Router separado para a rota aninhada /pools/:id/matches
export const poolMatchesRouter = Router({ mergeParams: true });
poolMatchesRouter.get('/', optionalAuthenticate, getPoolMatches);
