import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db';
import { analyzeImage, analyzePdf } from '../services/vision';

export const router = Router();

// POST /api/blueprint/analyze
// Body: { dataUrl: string, fileName: string }
// The frontend sends the image/PDF as a base64 dataUrl.
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { dataUrl, fileName } = req.body as { dataUrl: string; fileName: string };

    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'dataUrl is required' });
      return;
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({
        error: 'ANTHROPIC_API_KEY not configured on server. Please set it in Railway environment variables.',
      });
      return;
    }

    // Parse the data URL: "data:<mimeType>;base64,<data>"
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) {
      res.status(400).json({ error: 'Invalid dataUrl format' });
      return;
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const id = randomUUID();

    // Store blueprint record
    try {
      getDb().prepare(`
        INSERT INTO blueprints (id, filename, mime_type, status, uploaded_at)
        VALUES (?, ?, ?, 'analyzing', ?)
      `).run(id, fileName ?? 'blueprint', mimeType, new Date().toISOString());
    } catch {
      // DB might not be available (e.g., in stateless serverless env) — proceed without storing
    }

    // Run AI analysis
    let analysis;
    if (mimeType === 'application/pdf') {
      analysis = await analyzePdf(base64Data);
    } else {
      analysis = await analyzeImage(base64Data, mimeType);
    }

    // Update DB record
    try {
      getDb().prepare(`
        UPDATE blueprints SET status = 'done', analysis = ? WHERE id = ?
      `).run(JSON.stringify(analysis), id);
    } catch {
      // Non-fatal
    }

    res.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    console.error('[blueprint/analyze]', message);
    res.status(500).json({ error: message });
  }
});

// GET /api/blueprint/:id — retrieve stored analysis
router.get('/:id', (req: Request, res: Response) => {
  try {
    const row = getDb().prepare('SELECT * FROM blueprints WHERE id = ?').get(req.params.id) as any;
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ ...row, analysis: row.analysis ? JSON.parse(row.analysis) : null });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});
