import { Request, Response } from 'express';
import { syncResultsFromApi } from '../services/results-sync.service';

export async function runInternalResultsSync(req: Request, res: Response): Promise<void> {
  try {
    const internalKey = req.headers['x-internal-key'];

    if (!internalKey || internalKey !== process.env.INTERNAL_SYNC_KEY) {
      res.status(403).json({ error: 'Acesso não autorizado.' });
      return;
    }

    const adminToken = process.env.ADMIN_SYNC_TOKEN;

    if (!adminToken) {
      res.status(500).json({ error: 'ADMIN_SYNC_TOKEN não configurado.' });
      return;
    }

    const summary = await syncResultsFromApi(adminToken);

    res.json({
      message: 'Sincronização interna concluída.',
      summary,
    });
  } catch (err: any) {
    console.error('[InternalSync] Erro ao sincronizar resultados:', err);
    res.status(500).json({ error: err?.message || 'Erro ao sincronizar resultados.' });
  }
}
