import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// PRIVATE — only the owner can see their own diary
router.get('/', authenticate, (req: AuthRequest, res: Response): void => {
  res.json(db.prepare(`SELECT * FROM diary_entries WHERE owner_id = ? ORDER BY created_at DESC`).all(req.user!.id));
});

router.get('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(req.params.id) as { owner_id: string } | undefined;
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
  if (entry.owner_id !== req.user!.id) { res.status(403).json({ error: 'This is private 🔒' }); return; }
  res.json(entry);
});

router.post('/', authenticate, (req: AuthRequest, res: Response): void => {
  const { title, content, mood, tags } = req.body;
  if (!content) { res.status(400).json({ error: 'Content required' }); return; }
  const id = uuidv4();
  db.prepare(`INSERT INTO diary_entries (id, owner_id, title, content, mood, tags)
    VALUES (?, ?, ?, ?, ?, ?)`).run(
    id, req.user!.id, title || null, content, mood || null, JSON.stringify(tags || [])
  );
  res.status(201).json({ id });
});

router.patch('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(req.params.id) as { owner_id: string } | undefined;
  if (!entry || entry.owner_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  const { title, content, mood, tags } = req.body;
  db.prepare(`UPDATE diary_entries SET title=COALESCE(?,title), content=COALESCE(?,content),
    mood=COALESCE(?,mood), tags=COALESCE(?,tags), updated_at=datetime('now') WHERE id=?
  `).run(title, content, mood, tags ? JSON.stringify(tags) : null, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(req.params.id) as { owner_id: string } | undefined;
  if (!entry || entry.owner_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  db.prepare('DELETE FROM diary_entries WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
