import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import { createRouter } from './routes/index.js';
import { errorHandler } from './lib/errors.js';

export function createApp({ db, config }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN, methods: ['GET', 'POST', 'PATCH'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use('/assets', express.static(fileURLToPath(new URL('../public', import.meta.url)), {
    maxAge: '1d', setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
  }));
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', createRouter(db, config));
  app.use((req, res) => res.status(404).json({ success: false, error: 'Rota nao encontrada.' }));
  app.use(errorHandler);
  return app;
}
