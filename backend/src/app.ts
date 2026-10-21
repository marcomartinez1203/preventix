import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler, notFound } from './middlewares/error.middleware';

import path from 'node:path';
import { createDemoRouter } from './demo/routes';

const app = express();

// ── Seguridad ──────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// ── Parsers ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Logger ────────────────────────────────────────────
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// ── Health check ──────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', mode: config.demoMode ? 'sustentacion' : 'postgresql', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── API Routes ────────────────────────────────────────
if (config.demoMode) {
  app.use('/api', createDemoRouter(path.resolve(__dirname, '../.data/demo.json'), config.jwt.secret));
} else {
  app.use('/api/auth', require('./modules/auth/auth.routes').default);
  app.use('/api/empresa', require('./modules/empresas/empresas.routes').default);
  app.use('/api/sedes', require('./modules/sedes/sedes.routes').default);
  app.use('/api/usuarios', require('./modules/usuarios/usuarios.routes').default);
  app.use('/api/equipos', require('./modules/equipos/equipos.routes').default);
  app.use('/api/fallas', require('./modules/fallas/fallas.routes').default);
  app.use('/api/mantenimientos', require('./modules/mantenimientos/mantenimientos.routes').default);
  app.use('/api/notificaciones', require('./modules/alertas/alertas.routes').default);
  app.use('/api/dashboard', require('./modules/dashboard/dashboard.routes').default);

}

// ── 404 & Error handler ───────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
