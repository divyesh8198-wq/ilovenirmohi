import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json(await db.prepare(`SELECT dp.*, u.display_name as creator_name FROM date_plans dp
    LEFT JOIN users u ON dp.creator_id = u.id ORDER BY dp.created_at DESC`).all());
});

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, plannedDate, location, budget, status, notes } = req.body;
  if (!title) { res.status(400).json({ error: 'Title required' }); return; }
  const id = uuidv4();
  await db.prepare(`INSERT INTO date_plans (id, creator_id, title, description, planned_date, location, budget, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, req.user!.id, title, description || null, plannedDate || null,
    location || null, budget || null, status || 'idea', notes || null
  );
  res.status(201).json({ id });
});

router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const plan = await db.prepare('SELECT * FROM date_plans WHERE id = ?').get(req.params.id) as { creator_id: string } | undefined;
  if (!plan || plan.creator_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  const { title, description, plannedDate, location, budget, status, rating, notes } = req.body;
  await db.prepare(`UPDATE date_plans SET title=COALESCE(?,title), description=COALESCE(?,description),
    planned_date=COALESCE(?,planned_date), location=COALESCE(?,location), budget=COALESCE(?,budget),
    status=COALESCE(?,status), rating=COALESCE(?,rating), notes=COALESCE(?,notes) WHERE id=?
  `).run(title, description, plannedDate, location, budget, status, rating, notes, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const plan = await db.prepare('SELECT * FROM date_plans WHERE id = ?').get(req.params.id) as { creator_id: string } | undefined;
  if (!plan || plan.creator_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  await db.prepare('DELETE FROM date_plans WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
