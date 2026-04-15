import prisma from '../utils/prisma';
import { createNotification } from './notification.service';

export const REMINDER_WINDOW_MINUTES = 120;

export async function notifyUsersAboutNextMatch(
  userIds: string[],
  poolId: string,
  nextMatchId: string,
  nextMatchDate: Date
) {
  const now = new Date();
  const diffMinutes = Math.floor((nextMatchDate.getTime() - now.getTime()) / 60000);

  if (diffMinutes <= 0 || diffMinutes > REMINDER_WINDOW_MINUTES) return;

  for (const userId of userIds) {
    const existingPrediction = await prisma.prediction.findUnique({
      where: {
        userId_matchId_poolId: {
          userId,
          matchId: nextMatchId,
          poolId,
        },
      },
    });

    if (!existingPrediction) {
      const pendingMessage = `Você ainda não palpitou o próximo jogo`;

      const existingPending = await prisma.notification.findFirst({
        where: {
          userId,
          poolId,
          title: 'Palpite pendente',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      await prisma.notification.upsert({
        where: {
          id: existingPending?.id || 'force-create',
        },
        update: {
          message: pendingMessage,
          isRead: false,
          readAt: null,
        },
        create: {
          userId,
          poolId,
          type: 'NEXT_MATCH_REMINDER',
          title: 'Palpite pendente',
          message: pendingMessage,
        },
      });

      continue;
    }

    const reminderMessage = `Seu próximo jogo fecha em ${diffMinutes} minutos`;

    const existingReminder = await prisma.notification.findFirst({
      where: {
        userId,
        poolId,
        title: 'Atenção',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!existingReminder) {
      await createNotification({
        userId,
        poolId,
        type: 'NEXT_MATCH_REMINDER',
        title: 'Atenção',
        message: reminderMessage,
      });
    } else if (existingReminder.message !== reminderMessage || existingReminder.isRead) {
      await prisma.notification.update({
        where: { id: existingReminder.id },
        data: {
          message: reminderMessage,
          isRead: false,
          readAt: null,
        },
      });
    }
  }
}
