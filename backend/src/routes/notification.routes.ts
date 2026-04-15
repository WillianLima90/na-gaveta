import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { listMyNotifications, markAllMyNotificationsAsRead, markOneNotificationAsRead } from '../controllers/notification.controller';

const router = Router();

router.get('/me', authenticate, listMyNotifications);
router.post('/read-all', authenticate, markAllMyNotificationsAsRead);
router.post('/:id/read', authenticate, markOneNotificationAsRead);

export default router;
