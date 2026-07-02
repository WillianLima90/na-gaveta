import { Router } from 'express';
import { createPublicCrmLead } from '../controllers/crm.controller';

const router = Router();

router.post('/leads', createPublicCrmLead);

export default router;
