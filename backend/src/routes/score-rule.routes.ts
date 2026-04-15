// ============================================================
// Na Gaveta — Rotas de Regras de Pontuação
// GET   /api/pools/:id/rules   → ver regras do bolão
// PATCH /api/pools/:id/rules   → atualizar regras (apenas dono)
// PATCH /api/rounds/:id/bonus  → marcar/desmarcar rodada como bônus
// ============================================================

import { Router } from 'express';
import {
  getPoolRules,
  updatePoolRules,
  toggleBonusRound,
} from '../controllers/score-rule.controller';
import { authenticate } from '../middlewares/auth.middleware';

// Router aninhado em /pools/:id/rules
export const poolRulesRouter = Router({ mergeParams: true });
poolRulesRouter.get('/', getPoolRules);
poolRulesRouter.patch('/', authenticate, updatePoolRules);

// Router para /rounds/:id/bonus
export const roundBonusRouter = Router({ mergeParams: true });
roundBonusRouter.patch('/', authenticate, toggleBonusRound);
