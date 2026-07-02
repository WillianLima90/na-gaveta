import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { listUsers, updateUserRole, updateUserActive, updateUserPlan, resetUserPassword, deleteUser } from '../controllers/admin-user.controller';
import { runResultsSync } from '../controllers/admin-sync.controller';
import { listAdminPools, updateAdminPoolActive, updateAdminPoolVisibility } from '../controllers/admin-pool.controller';
import { listCrmLeads, createCrmLead, updateCrmLead } from '../controllers/admin-crm.controller';

const router = Router();

router.get('/users', authenticate, listUsers);
router.patch('/users/:id/role', authenticate, updateUserRole);
router.patch('/users/:id/active', authenticate, updateUserActive);
router.patch('/users/:id/plan', authenticate, updateUserPlan);
router.patch('/users/:id/password', authenticate, resetUserPassword);
router.delete('/users/:id', authenticate, deleteUser);
router.post('/sync-results', authenticate, runResultsSync);
router.get('/pools', authenticate, listAdminPools);
router.patch('/pools/:id/active', authenticate, updateAdminPoolActive);
router.patch('/pools/:id/visibility', authenticate, updateAdminPoolVisibility);
router.get('/crm/leads', authenticate, listCrmLeads);
router.post('/crm/leads', authenticate, createCrmLead);
router.patch('/crm/leads/:id', authenticate, updateCrmLead);

export default router;
