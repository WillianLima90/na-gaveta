// ============================================================
// Na Gaveta — Rotas de Autenticação
// POST /api/auth/register
// POST /api/auth/login
// GET  /api/auth/me  (protegida)
// ============================================================

import { Router } from 'express';
import { register, login, getProfile, updateProfile, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Registro de novo usuário
router.post('/register', register);

// Login
router.post('/login', login);

// Perfil do usuário autenticado (requer JWT)
router.get('/me', authenticate, getProfile);
router.patch('/me', authenticate, updateProfile);
router.patch('/change-password', authenticate, changePassword);

export default router;
