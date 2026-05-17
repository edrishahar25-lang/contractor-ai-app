import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool } from '../db';
import { analyzeImage, analyzePdf } from '../services/vision';

export const router = Router();

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

// POST /api/blueprint/analyze
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { dataUrl, fileName } = req.body as { dataUrl: string; fileName: string };

    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'dataUrl חסר בבקשה' });
      return;
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({
        error: 'מפתח API לא מוגדר בשרת. הגדר ANTHROPIC_API_KEY במשתני הסביבה.',
      });
      return;
    }

    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1 || !dataUrl.startsWith('data:')) {
      res.status(400).json({ error: 'פורמט dataUrl לא תקין' });
      return;
    }

    const headerPart = dataUrl.slice(5, commaIdx);
    const base64Raw = dataUrl.slice(commaIdx + 1).trim();

    if (!headerPart.includes(';base64')) {
      res.status(400).json({ error: 'dataUrl חייב להיות base64' });
      return;
    }

    const mimeType = headerPart.replace(';base64', '').trim();

    if (!mimeType) {
      res.status(400).json({ error: 'לא ניתן לזהות סוג קובץ' });
      return;
    }

    if (mimeType !== 'application/pdf' && !SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
      res.status(400).json({
        error: `סוג קובץ לא נתמך: ${mimeType}. השתמש ב-PNG, JPG, WEBP, או PDF.`,
      });
      return;
    }

    const id = randomUUID();
    const pool = getPool();

    if (pool) {
      try {
        await pool.query(
          `INSERT INTO blueprints (id, filename, mime_type, status, uploaded_at)
           VALUES ($1, $2, $3, 'analyzing', $4)`,
          [id, fileName ?? 'blueprint', mimeType, new Date().toISOString()],
        );
      } catch { /* non-fatal */ }
    }

    let analysis;
    if (mimeType === 'application/pdf') {
      analysis = await analyzePdf(base64Raw);
    } else {
      analysis = await analyzeImage(base64Raw, mimeType);
    }

    if (pool) {
      try {
        await pool.query(
          `UPDATE blueprints SET status = 'done', analysis = $1 WHERE id = $2`,
          [JSON.stringify(analysis), id],
        );
      } catch { /* non-fatal */ }
    }

    res.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאה לא ידועה בניתוח התוכנית';
    console.error('[blueprint/analyze] error:', message);
    res.status(500).json({ error: message });
  }
});

// GET /api/blueprint/:id
router.get('/:id', async (req: Request, res: Response) => {
  const pool = getPool();
  if (!pool) { res.status(404).json({ error: 'לא נמצא' }); return; }
  try {
    const { rows } = await pool.query('SELECT * FROM blueprints WHERE id = $1', [req.params.id]);
    if (!rows[0]) { res.status(404).json({ error: 'לא נמצא' }); return; }
    const row = rows[0];
    res.json({ ...row, analysis: row.analysis ? JSON.parse(row.analysis) : null });
  } catch {
    res.status(500).json({ error: 'שגיאת מסד נתונים' });
  }
});
