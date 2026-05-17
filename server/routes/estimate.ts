import { Router } from 'express';
import { estimateFromBrief } from '../services/estimationAi';

export const router = Router();

router.post('/ai-brief', async (req, res) => {
  try {
    const brief = req.body;
    if (!brief || typeof brief.totalSqm !== 'number') {
      return res.status(400).json({ error: 'נתוני הפרויקט חסרים או לא תקינים' });
    }
    const result = await estimateFromBrief(brief);
    res.json(result);
  } catch (err: any) {
    const msg = err?.message ?? 'שגיאה לא ידועה';
    console.error('[estimate] ai-brief error:', msg);
    res.status(500).json({ error: msg });
  }
});
