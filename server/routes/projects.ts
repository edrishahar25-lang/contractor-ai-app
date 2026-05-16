import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db';

export const router = Router();

// GET /api/projects
router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = getDb().prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as any[];
    res.json(rows.map((r) => ({ ...r, data: JSON.parse(r.data) })));
  } catch { res.status(500).json({ error: 'DB error' }); }
});

// GET /api/projects/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ ...row, data: JSON.parse(row.data) });
  } catch { res.status(500).json({ error: 'DB error' }); }
});

// POST /api/projects
router.post('/', (req: Request, res: Response) => {
  try {
    const { data, blueprint_id } = req.body;
    const id = data?.id ?? randomUUID();
    const now = new Date().toISOString();
    getDb().prepare(`
      INSERT OR REPLACE INTO projects (id, blueprint_id, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, blueprint_id ?? null, JSON.stringify(data), data?.createdAt ?? now, now);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

// PUT /api/projects/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    getDb().prepare(`
      UPDATE projects SET data = ?, updated_at = ? WHERE id = ?
    `).run(JSON.stringify(data), new Date().toISOString(), req.params.id);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'DB error' }); }
});

// DELETE /api/projects/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    getDb().prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'DB error' }); }
});
