import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export async function listMyNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('[Notification] Erro ao listar notificações:', err);
    res.status(500).json({ error: 'Erro ao listar notificações.' });
  }
}

export async function markAllMyNotificationsAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Notification] Erro ao marcar notificações como lidas:', err);
    res.status(500).json({ error: 'Erro ao marcar notificações como lidas.' });
  }
}

export async function markOneNotificationAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }

    await prisma.notification.updateMany({
      where: {
        id,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Notification] Erro ao marcar notificação como lida:', err);
    res.status(500).json({ error: 'Erro ao marcar notificação como lida.' });
  }
}
