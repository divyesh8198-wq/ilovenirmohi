import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json(await db.prepare(`SELECT c.*, u.display_name as creator_name FROM countdowns c
    LEFT JOIN users u ON c.creator_id = u.id ORDER BY c.target_date ASC`).all());
});

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, targetDate, category, emoji, isRecurring } = req.body;
  if (!title || !targetDate) { res.status(400).json({ error: 'Title and date required' }); return; }
  const id = uuidv4();
  await db.prepare(`INSERT INTO countdowns (id, creator_id, title, target_date, category, emoji, is_recurring)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    id, req.user!.id, title, targetDate, category || 'anniversary', emoji || '💗', isRecurring ? 1 : 0
  );
  res.status(201).json({ id });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const cd = await db.prepare('SELECT * FROM countdowns WHERE id = ?').get(req.params.id) as { creator_id: string } | undefined;
  if (!cd || cd.creator_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  await db.prepare('DELETE FROM countdowns WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
