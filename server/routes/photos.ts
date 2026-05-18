import { Router, Request, Response } from 'express';
import { analyzePropertyPhoto } from '../services/photoAnalysis';

export const router = Router();

router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { base64Image, mimeType } = req.body as {
      base64Image?: string;
      mimeType?: string;
    };

    if (!base64Image) {
      res.status(400).json({ error: 'חסרה תמונה' });
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const type = validTypes.includes(mimeType ?? '') ? mimeType! : 'image/jpeg';

    const result = await analyzePropertyPhoto(
      base64Image,
      type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
    );

    res.json(result);
  } catch (err) {
    console.error('[photos/analyze]', err);
    res.status(500).json({ error: (err as Error).message ?? 'שגיאה בניתוח תמונה' });
  }
});
