import { Router, Request, Response } from 'express';
import { parseVoiceTranscript } from '../services/voiceQuote';

export const router = Router();

router.post('/parse', async (req: Request, res: Response) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY לא מוגדר בשרת' });
    return;
  }
  try {
    const { transcript } = req.body as { transcript?: string };
    if (!transcript?.trim()) {
      res.status(400).json({ error: 'חסר תיאור הפרויקט' });
      return;
    }
    const result = await parseVoiceTranscript(transcript.trim());
    res.json(result);
  } catch (err) {
    console.error('[voice/parse]', (err as Error).message);
    res.status(500).json({ error: (err as Error).message ?? 'שגיאה בניתוח' });
  }
});
