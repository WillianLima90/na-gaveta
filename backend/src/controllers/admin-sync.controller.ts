import { Response } from 'express';
import { AuthRequest } from '../types';
import { syncResultsFromApi } from '../services/results-sync.service';
import jwt from 'jsonwebtoken';

export async function runResultsSync(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas ADMIN pode rodar sincronização.' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ error: 'JWT_SECRET não configurado.' });
      return;
    }

    const adminToken = jwt.sign(
      { userId: req.user.userId, email: req.user.email, role: req.user.role },
      secret,
      { expiresIn: '15m' }
    );

    const summary = await syncResultsFromApi(adminToken);
    res.json({
      message: 'Sincronização concluída.',
      summary,
    });
  } catch (err: any) {
    console.error('[AdminSync] Erro ao sincronizar resultados:', err);
    res.status(500).json({ error: err?.message || 'Erro ao sincronizar resultados.' });
  }
}
