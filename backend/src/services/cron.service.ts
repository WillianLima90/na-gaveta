import cron from 'node-cron';
import prisma from '../utils/prisma';
import { notifyUsersAboutNextMatch, REMINDER_WINDOW_MINUTES } from './reminder.service';
import { syncResultsFromApi } from './results-sync.service';

export function startReminderCron() {
  cron.schedule('*/15 * * * *', async () => {
    console.log('[CRON] Running reminder job...');

    const usersPools = await prisma.poolMember.findMany({
      select: {
        userId: true,
        poolId: true,
      },
      orderBy: {
        poolId: 'asc',
      },
    });

    console.log('[CRON] pool members:', usersPools.length);
    console.log('[CRON] unique pools:', new Set(usersPools.map((item) => item.poolId)).size);

    const grouped = new Map<string, string[]>();

    for (const item of usersPools) {
      const current = grouped.get(item.poolId) || [];
      current.push(item.userId);
      grouped.set(item.poolId, current);
    }

    for (const [poolId, userIds] of grouped.entries()) {
      try {
        const pool = await prisma.pool.findUnique({
          where: { id: poolId },
          select: { championshipId: true },
        });

        if (!pool) continue;

        const matches = await prisma.match.findMany({
          where: {
            round: {
              championshipId: pool.championshipId,
            },
            status: 'SCHEDULED',
          },
          orderBy: { matchDate: 'asc' },
          take: 5,
          select: {
            id: true,
            matchDate: true,
          },
        });

        const now = new Date();

        const nextMatch = matches.find((match) => {
          const diff = (match.matchDate.getTime() - now.getTime()) / 60000;
          return diff > 0 && diff <= REMINDER_WINDOW_MINUTES;
        });

        if (!nextMatch) continue;

        await notifyUsersAboutNextMatch(
          userIds,
          poolId,
          nextMatch.id,
          nextMatch.matchDate
        );
      } catch (err) {
        console.error('[CRON] Error:', err);
      }
    }
  });
}


export function startResultsSyncCron() {
  cron.schedule('* * * * *', async () => {
    console.log('[CRON] Running results sync...');

    try {
      const token = process.env.ADMIN_SYNC_TOKEN;
      if (!token) {
        console.error('[CRON] ADMIN_SYNC_TOKEN não configurado');
        return;
      }

      const summary = await syncResultsFromApi(token);

      console.log('[CRON] Sync summary:', {
        finishedApi: summary.finishedApi,
        matchedLocal: summary.matchedLocal,
        updated: summary.updated,
        skipped: summary.skipped,
      });

    } catch (err) {
      console.error('[CRON] Sync error:', err);
    }
  });
}
