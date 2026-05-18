import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db';
import { router as blueprintRouter } from './routes/blueprint';
import { router as projectsRouter } from './routes/projects';
import { router as estimateRouter } from './routes/estimate';
import { router as projectAiRouter } from './routes/projectAi';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();

// ── Health routes — registered first, no middleware needed ──────────────────

app.get('/health', (_req, res) => { res.status(200).send('OK'); });
app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString(), aiReady: !!process.env.ANTHROPIC_API_KEY });
});

// ── Security & parsing ──────────────────────────────────────────────────────

app.use(cors({
  origin: IS_PROD ? (process.env.FRONTEND_URL ?? '*') : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Blueprint images can be large (10MB+); allow up to 25MB JSON body
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ── API routes ──────────────────────────────────────────────────────────────

app.use('/api/blueprint', blueprintRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/estimate', estimateRouter);
app.use('/api/project-ai', projectAiRouter);

// ── Static frontend (production only) ──────────────────────────────────────

if (IS_PROD) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  // SPA fallback — send index.html for all non-API routes
  app.get('/{*path}', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ── Start ────────────────────────────────────────────────────────────────────

async function start() {
  console.log(`[server] PORT=${PORT} NODE_ENV=${process.env.NODE_ENV ?? 'development'}`);

  const server = app.listen(PORT, '0.0.0.0');

  server.on('listening', () => {
    console.log('SERVER STARTED');
    console.log('HEALTHCHECK READY');
    console.log(`[server] listening on 0.0.0.0:${PORT}`);
    console.log(`[server] AI ready: ${!!process.env.ANTHROPIC_API_KEY}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error(`[server] FATAL listen error: ${err.code} — ${err.message}`);
    process.exit(1);
  });

  // DB init happens AFTER server is up — never blocks healthcheck
  try {
    await initDb();
  } catch (err) {
    console.warn('[db] Could not initialize DB:', (err as Error).message);
  }
}

process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err.message);
  process.exit(1);
});

start();
