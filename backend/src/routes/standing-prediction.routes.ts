import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getStandingPrediction,
  saveStandingPrediction,
  updateStandingPredictionConfig,
} from '../controllers/standing-prediction.controller';

const router = Router({ mergeParams: true });

router.get('/', authenticate, getStandingPrediction);
router.put('/', authenticate, saveStandingPrediction);
router.patch('/config', authenticate, updateStandingPredictionConfig);

export default router;
