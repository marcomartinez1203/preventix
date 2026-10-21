import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createDemoRouter } from './demo/routes';
import { blobPersistence } from './demo/persistence';
import type { Database } from './demo/store';

// A single Function handles the API; it never starts a listening server or Prisma.
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });

app.get('/health', (_req, res) => res.json({ status: 'ok', mode: 'sustentacion-vercel' }));
app.use('/api', (_req, res, next) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    res.status(503).json({ message: 'Configura un Vercel Blob privado (BLOB_READ_WRITE_TOKEN) y JWT_SECRET de al menos 32 caracteres, y vuelve a desplegar.' });
    return;
  }
  next();
});

const pathname = process.env.DEMO_BLOB_PATH || `preventix/${process.env.VERCEL_ENV === 'production' ? 'production' : 'preview'}/demo.json`;
app.use('/api', createDemoRouter(blobPersistence<Database>(pathname), process.env.JWT_SECRET || '', true));
app.use((_req, res) => res.status(404).json({ message: 'Ruta de API no encontrada.' }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error procesando la API:', error);
  res.status(400).json({ message: 'Solicitud inválida.' });
});

export default app;
