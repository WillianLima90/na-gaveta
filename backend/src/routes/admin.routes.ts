import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { listUsers, updateUserRole, updateUserActive } from '../controllers/admin-user.controller';
import { runResultsSync } from '../controllers/admin-sync.controller';

const router = Router();

router.get('/users', authenticate, listUsers);
router.patch('/users/:id/role', authenticate, updateUserRole);
router.patch('/users/:id/active', authenticate, updateUserActive);
router.post('/sync-results', authenticate, runResultsSync);

export default router;
