import prisma from '../utils/prisma';

export async function createNotification({
  userId,
  poolId,
  type,
  title,
  message,
}: {
  userId: string;
  poolId?: string;
  type: 'NEXT_MATCH_REMINDER' | 'BONUS_ROUND_ACTIVE' | 'ROUND_STARTED' | 'ROUND_RESULT';
  title: string;
  message: string;
}) {
  return prisma.notification.create({
    data: {
      userId,
      poolId,
      type,
      title,
      message,
    },
  });
}
