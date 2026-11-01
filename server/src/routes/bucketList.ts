import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, (_req: AuthRequest, res: Response): void => {
  res.json(db.prepare(`SELECT bl.*, u.display_name as creator_name FROM bucket_list bl
    LEFT JOIN users u ON bl.creator_id = u.id ORDER BY bl.priority ASC, bl.created_at DESC`).all());
});

router.post('/', authenticate, (req: AuthRequest, res: Response): void => {
  const { title, description, category, priority } = req.body;
  if (!title) { res.status(400).json({ error: 'Title required' }); return; }
  const id = uuidv4();
  db.prepare(`INSERT INTO bucket_list (id, creator_id, title, description, category, priority)
    VALUES (?, ?, ?, ?, ?, ?)`).run(
    id, req.user!.id, title, description || null, category || 'experience', priority || 3
  );
  res.status(201).json({ id });
});

router.patch('/:id/complete', authenticate, (req: AuthRequest, res: Response): void => {
  db.prepare(`UPDATE bucket_list SET is_completed = 1, completed_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Completed! 🎉' });
});

router.patch('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const item = db.prepare('SELECT * FROM bucket_list WHERE id = ?').get(req.params.id) as { creator_id: string } | undefined;
  if (!item || item.creator_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  const { title, description, category, priority } = req.body;
  db.prepare(`UPDATE bucket_list SET title=COALESCE(?,title), description=COALESCE(?,description),
    category=COALESCE(?,category), priority=COALESCE(?,priority) WHERE id=?`).run(title, description, category, priority, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const item = db.prepare('SELECT * FROM bucket_list WHERE id = ?').get(req.params.id) as { creator_id: string } | undefined;
  if (!item || item.creator_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  db.prepare('DELETE FROM bucket_list WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
