import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool } from '../db';

export const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const pool = getPool();
  if (!pool) { res.json([]); return; }
  try {
    const { rows } = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(rows.map((r: any) => ({ ...r, data: JSON.parse(r.data) })));
  } catch { res.status(500).json({ error: 'DB error' }); }
});

router.get('/:id', async (req: Request, res: Response) => {
  const pool = getPool();
  if (!pool) { res.status(404).json({ error: 'Not found' }); return; }
  try {
    const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ ...rows[0], data: JSON.parse(rows[0].data) });
  } catch { res.status(500).json({ error: 'DB error' }); }
});

router.post('/', async (req: Request, res: Response) => {
  const pool = getPool();
  const { data, blueprint_id } = req.body;
  const id = data?.id ?? randomUUID();
  if (!pool) { res.status(201).json({ id }); return; }
  try {
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO projects (id, blueprint_id, data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET data = $3, updated_at = $5`,
      [id, blueprint_id ?? null, JSON.stringify(data), data?.createdAt ?? now, now],
    );
    res.status(201).json({ id });
  } catch { res.status(500).json({ error: 'DB error' }); }
});

router.put('/:id', async (req: Request, res: Response) => {
  const pool = getPool();
  if (!pool) { res.json({ ok: true }); return; }
  try {
    const { data } = req.body;
    await pool.query(
      'UPDATE projects SET data = $1, updated_at = $2 WHERE id = $3',
      [JSON.stringify(data), new Date().toISOString(), req.params.id],
    );
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'DB error' }); }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const pool = getPool();
  if (!pool) { res.json({ ok: true }); return; }
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'DB error' }); }
});
