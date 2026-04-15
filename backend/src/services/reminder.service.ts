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
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        poolId,
        type: 'NEXT_MATCH_REMINDER',
        message: {
          contains: String(nextMatchId),
        },
      },
    });

    if (existing) continue;

    await createNotification({
      userId,
      poolId,
      type: 'NEXT_MATCH_REMINDER',
      title: 'Atenção',
      message: `Seu próximo jogo fecha em ${diffMinutes} minutos`,
    });
  }
}
