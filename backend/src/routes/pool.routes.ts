// ============================================================
// Na Gaveta — Rotas de Bolões v3
// GET   /api/pools                          → bolões públicos
// GET   /api/pools/user/mine                → meus bolões
// GET   /api/pools/:id                      → detalhe do bolão
// POST  /api/pools                          → criar bolão
// POST  /api/pools/join                     → entrar via código
// POST  /api/pools/:id/join                 → entrar pelo ID
// GET   /api/pools/:id/matches              → partidas com palpites
// GET   /api/pools/:id/ranking              → ranking geral
// GET   /api/pools/:id/rounds/:rId/ranking  → ranking por rodada
// GET   /api/pools/:id/rounds/:rId/highlights → destaques da rodada
// GET   /api/pools/:id/users/:uId/history   → histórico do usuário
// GET   /api/pools/:id/rules                → regras de pontuação
// PATCH /api/pools/:id/rules                → atualizar regras (dono)
// ============================================================

import { Router } from 'express';
import { listPools, getPool, createPool, joinPool, joinPoolById, myPools, drawBonusRound, setFavoriteTeam, listPendingMembers, approveMember, rejectMember, listApprovedMembers, removeMember, leavePool, updatePoolVisibility, cancelJoinRequest } from '../controllers/pool.controller';
import { deletePool } from '../controllers/pool.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { poolMatchesRouter } from './match.routes';
import { poolRankingRouter, poolRoundsRouter, poolUsersRouter, poolRoundWinnersRouter } from './ranking.routes';
import { poolRulesRouter } from './score-rule.routes';

const router = Router();

// ── Rotas estáticas (antes de /:id para evitar conflito) ─────
router.get('/user/mine', authenticate, myPools);
router.post('/join', authenticate, joinPool);

// ── Rotas públicas ───────────────────────────────────────────
router.get('/', listPools);
router.get('/:id', optionalAuthenticate, getPool);

// ── Rotas protegidas ─────────────────────────────────────────
router.delete('/:id', authenticate, deletePool);
router.post('/', authenticate, createPool);
router.post('/:id/join', authenticate, joinPoolById);
router.patch('/:id/favorite-team', authenticate, setFavoriteTeam);
router.post('/:id/bonus/draw', authenticate, drawBonusRound);
router.get("/:id/members/pending", authenticate, listPendingMembers);
router.get("/:id/members/approved", authenticate, listApprovedMembers);
router.patch("/:id/members/:memberId/approve", authenticate, approveMember);
router.patch("/:id/members/:memberId/reject", authenticate, rejectMember);
router.patch("/:id/visibility", authenticate, updatePoolVisibility);
router.delete("/:id/leave", authenticate, leavePool);
router.delete("/:id/request", authenticate, cancelJoinRequest);
router.delete("/:id/members/:memberId", authenticate, removeMember);

// ── Sub-rotas aninhadas ──────────────────────────────────────
router.use('/:id/matches', poolMatchesRouter);   // partidas com palpites
router.use('/:id/ranking', poolRankingRouter);   // ranking geral
router.use('/:id/rounds', poolRoundsRouter);     // ranking e destaques por rodada
router.use('/:id/users', poolUsersRouter);       // histórico do usuário
router.use('/:id/rules', poolRulesRouter);       // regras de pontuação
router.use('/:id/round-winners', poolRoundWinnersRouter); // vencedores de rodada com escudos

export default router;
