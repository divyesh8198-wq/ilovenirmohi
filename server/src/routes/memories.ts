import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, (_req: AuthRequest, res: Response): void => {
  res.json(db.prepare(`SELECT m.*, u.display_name as creator_name FROM memories m
    LEFT JOIN users u ON m.creator_id = u.id
    WHERE m.visibility = 'shared' ORDER BY m.event_date DESC`).all());
});

router.post('/', authenticate, (req: AuthRequest, res: Response): void => {
  const { title, description, eventDate, event_date, photoIds, visibility } = req.body;
  const date = eventDate || event_date;
  if (!title || !date) { res.status(400).json({ error: 'Title and date required' }); return; }
  const id = uuidv4();
  db.prepare(`INSERT INTO memories (id, creator_id, title, description, event_date, photo_ids, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    id, req.user!.id, title, description || null, date,
    JSON.stringify(photoIds || []), visibility || 'shared'
  );
  res.status(201).json({ id });
});

router.patch('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const mem = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id) as { creator_id: string } | undefined;
  if (!mem || mem.creator_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  const { title, description, eventDate, photoIds, visibility } = req.body;
  db.prepare(`UPDATE memories SET title=COALESCE(?,title), description=COALESCE(?,description),
    event_date=COALESCE(?,event_date), photo_ids=COALESCE(?,photo_ids), visibility=COALESCE(?,visibility)
    WHERE id=?`).run(title, description, eventDate, photoIds ? JSON.stringify(photoIds) : null, visibility, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const mem = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id) as { creator_id: string } | undefined;
  if (!mem || mem.creator_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  db.prepare('DELETE FROM memories WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
