// ============================================================
// Na Gaveta — Configuração central do Express v3
// Novidades v3: rotas de ranking, score-rules e rounds/bonus
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Rotas
import healthRouter from './routes/health.routes';
import authRouter from './routes/auth.routes';
import poolRouter from './routes/pool.routes';
import championshipRouter from './routes/championship.routes';
import matchRouter from './routes/match.routes';
import predictionRouter from './routes/prediction.routes';
import notificationRouter from './routes/notification.routes';
import { roundBonusRouter } from './routes/score-rule.routes';

const app = express();

// ── Segurança e parsing ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Logs de requisição (apenas em dev) ──────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Rotas da API ─────────────────────────────────────────────
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/pools', poolRouter);           // inclui /pools/:id/matches, /ranking, /rules
app.use('/api/championships', championshipRouter);
app.use('/api/matches', matchRouter);        // inclui /matches/:id/result e /joker
app.use('/api/predictions', predictionRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/rounds/:id/bonus', roundBonusRouter); // marcar rodada como bônus

// ── Handler de rota não encontrada ──────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ── Handler global de erros ──────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;
