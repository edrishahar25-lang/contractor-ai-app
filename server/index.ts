import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db';
import { router as blueprintRouter } from './routes/blueprint';
import { router as projectsRouter } from './routes/projects';
import { router as estimateRouter } from './routes/estimate';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();

// ── Health routes — registered first, no middleware needed ──────────────────

app.get('/', (_req, res) => { res.status(200).send('OK'); });
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

// ── Static frontend (production only) ──────────────────────────────────────

if (IS_PROD) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  // SPA fallback — send index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ── Start ────────────────────────────────────────────────────────────────────

async function start() {
  // Listen immediately so Railway healthcheck passes before DB init
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] running on port ${PORT} (${IS_PROD ? 'production' : 'development'})`);
    console.log(`[server] AI ready: ${!!process.env.ANTHROPIC_API_KEY}`);
  });

  try {
    await initDb();
  } catch (err) {
    console.warn('[db] Could not initialize DB:', (err as Error).message);
  }
}

start();
