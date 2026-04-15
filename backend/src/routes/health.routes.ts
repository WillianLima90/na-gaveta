// ============================================================
// Na Gaveta — Rota de healthcheck
// Usada para monitoramento e verificação de disponibilidade
// ============================================================

import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  try {
    // Verifica conectividade com o banco
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ok',
      service: 'Na Gaveta API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch {
    res.status(503).json({
      status: 'error',
      service: 'Na Gaveta API',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

export default router;
