import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { listUsers, updateUserRole, updateUserActive } from '../controllers/admin-user.controller';

const router = Router();

router.get('/users', authenticate, listUsers);
router.patch('/users/:id/role', authenticate, updateUserRole);
router.patch('/users/:id/active', authenticate, updateUserActive);

export default router;
