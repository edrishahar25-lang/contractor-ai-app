import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db';
import { analyzeImage, analyzePdf } from '../services/vision';

export const router = Router();

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

// POST /api/blueprint/analyze
// Body: { dataUrl: string, fileName: string }
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

    // Parse the data URL: "data:<mimeType>;base64,<data>"
    // Use non-dotAll regex + explicit trim to avoid trailing-whitespace bugs
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1 || !dataUrl.startsWith('data:')) {
      res.status(400).json({ error: 'פורמט dataUrl לא תקין' });
      return;
    }

    const headerPart = dataUrl.slice(5, commaIdx); // after "data:"
    const base64Raw = dataUrl.slice(commaIdx + 1).trim(); // raw base64, trimmed

    if (!headerPart.includes(';base64')) {
      res.status(400).json({ error: 'dataUrl חייב להיות base64' });
      return;
    }

    const mimeType = headerPart.replace(';base64', '').trim();

    if (!mimeType) {
      res.status(400).json({ error: 'לא ניתן לזהות סוג קובץ' });
      return;
    }

    // Reject unknown types early with a clear message
    if (mimeType !== 'application/pdf' && !SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
      res.status(400).json({
        error: `סוג קובץ לא נתמך: ${mimeType}. השתמש ב-PNG, JPG, WEBP, או PDF.`,
      });
      return;
    }

    const id = randomUUID();

    try {
      getDb().prepare(`
        INSERT INTO blueprints (id, filename, mime_type, status, uploaded_at)
        VALUES (?, ?, ?, 'analyzing', ?)
      `).run(id, fileName ?? 'blueprint', mimeType, new Date().toISOString());
    } catch {
      // DB unavailable in some environments — continue without persisting
    }

    let analysis;
    if (mimeType === 'application/pdf') {
      analysis = await analyzePdf(base64Raw);
    } else {
      analysis = await analyzeImage(base64Raw, mimeType);
    }

    try {
      getDb().prepare(`
        UPDATE blueprints SET status = 'done', analysis = ? WHERE id = ?
      `).run(JSON.stringify(analysis), id);
    } catch { /* non-fatal */ }

    res.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאה לא ידועה בניתוח התוכנית';
    console.error('[blueprint/analyze] error:', message);
    res.status(500).json({ error: message });
  }
});

// GET /api/blueprint/:id — retrieve stored analysis
router.get('/:id', (req: Request, res: Response) => {
  try {
    const row = getDb().prepare('SELECT * FROM blueprints WHERE id = ?').get(req.params.id) as any;
    if (!row) { res.status(404).json({ error: 'לא נמצא' }); return; }
    res.json({ ...row, analysis: row.analysis ? JSON.parse(row.analysis) : null });
  } catch {
    res.status(500).json({ error: 'שגיאת מסד נתונים' });
  }
});
