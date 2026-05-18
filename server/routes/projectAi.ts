import { Router, Request, Response } from 'express';
import {
  generateFollowupMessage,
  generateWorkOrders,
  calculateScopeChange,
  generateShoppingList,
  generateContract,
  runBudgetGuardian,
  calculateRiskScore,
  generatePaymentReminders,
  analyzeCompetitiveIntel,
} from '../services/projectAi';

export const router = Router();

function requireKey(res: Response): boolean {
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY לא מוגדר בשרת' });
    return false;
  }
  return true;
}

router.post('/followup', async (req: Request, res: Response) => {
  if (!requireKey(res)) return;
  try {
    const message = await generateFollowupMessage(req.body);
    res.json({ message });
  } catch (err) {
    console.error('[project-ai/followup]', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/work-orders', async (req: Request, res: Response) => {
  if (!requireKey(res)) return;
  try {
    const trades = await generateWorkOrders(req.body);
    res.json({ trades });
  } catch (err) {
    console.error('[project-ai/work-orders]', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/scope-change', async (req: Request, res: Response) => {
  if (!requireKey(res)) return;
  try {
    const delta = await calculateScopeChange(req.body);
    res.json(delta);
  } catch (err) {
    console.error('[project-ai/scope-change]', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/shopping-list', async (req: Request, res: Response) => {
  if (!requireKey(res)) return;
  try {
    const categories = await generateShoppingList(req.body);
    res.json({ categories });
  } catch (err) {
    console.error('[project-ai/shopping-list]', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/contract', async (req: Request, res: Response) => {
  if (!requireKey(res)) return;
  try {
    const contractText = await generateContract(req.body);
    res.json({ contractText });
  } catch (err) {
    console.error('[project-ai/contract]', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/budget', async (req: Request, res: Response) => {
  if (!requireKey(res)) return;
  try {
    const result = await runBudgetGuardian(req.body);
    res.json(result);
  } catch (err) {
    console.error('[project-ai/budget]', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/risk', async (req: Request, res: Response) => {
  if (!requireKey(res)) return;
  try {
    const result = await calculateRiskScore(req.body);
    res.json(result);
  } catch (err) {
    console.error('[project-ai/risk]', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/payment-reminder', async (req: Request, res: Response) => {
  if (!requireKey(res)) return;
  try {
    const result = await generatePaymentReminders(req.body);
    res.json(result);
  } catch (err) {
    console.error('[project-ai/payment-reminder]', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/competitive-intel', async (req: Request, res: Response) => {
  if (!requireKey(res)) return;
  try {
    const result = await analyzeCompetitiveIntel(req.body);
    res.json(result);
  } catch (err) {
    console.error('[project-ai/competitive-intel]', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});
