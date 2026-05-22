import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { listUsers, updateUserRole, updateUserActive } from '../controllers/admin-user.controller';
import { runResultsSync } from '../controllers/admin-sync.controller';
import { listAdminPools, updateAdminPoolActive } from '../controllers/admin-pool.controller';

const router = Router();

router.get('/users', authenticate, listUsers);
router.patch('/users/:id/role', authenticate, updateUserRole);
router.patch('/users/:id/active', authenticate, updateUserActive);
router.post('/sync-results', authenticate, runResultsSync);
router.get('/pools', authenticate, listAdminPools);
router.patch('/pools/:id/active', authenticate, updateAdminPoolActive);

export default router;
