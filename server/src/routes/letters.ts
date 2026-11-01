import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Only see letters addressed to you or authored by you
router.get('/', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const letters = db.prepare(`
    SELECT l.*, u.display_name as author_name, u.username as author_username FROM letters l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE l.author_id = ? OR (l.is_shared = 1 AND (l.recipient_id = ? OR l.recipient_id IS NULL))
    ORDER BY l.created_at DESC
  `).all(user.id, user.id);
  res.json(letters);
});

router.get('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const letter = db.prepare('SELECT * FROM letters WHERE id = ?').get(req.params.id) as {
    id: string; author_id: string; recipient_id: string; is_shared: number;
  } | undefined;
  if (!letter) { res.status(404).json({ error: 'Not found' }); return; }
  if (letter.author_id !== user.id && !(letter.is_shared && letter.recipient_id === user.id)) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  res.json(letter);
});

router.post('/', authenticate, (req: AuthRequest, res: Response): void => {
  const { title, subject, content, recipientUsername, mood, isDraft, is_draft } = req.body;
  const letterTitle = title || subject;
  if (!letterTitle || !content) { res.status(400).json({ error: 'Title and content required' }); return; }
  
  // Find other user as recipient by default
  const otherUser = db.prepare('SELECT id FROM users WHERE id != ?').get(req.user!.id) as { id: string } | undefined;
  let recipientId = otherUser?.id || null;
  if (recipientUsername) {
    const recipient = db.prepare('SELECT id FROM users WHERE username = ?').get(recipientUsername) as { id: string } | undefined;
    if (recipient) recipientId = recipient.id;
  }

  const draftVal = (isDraft === true || is_draft === true) ? 1 : 0;
  const sharedVal = draftVal ? 0 : 1;

  const id = uuidv4();
  db.prepare(`INSERT INTO letters (id, author_id, recipient_id, title, content, mood, is_draft, is_shared)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, req.user!.id, recipientId, letterTitle, content, mood || null,
    draftVal, sharedVal
  );
  res.status(201).json({ id });
});

router.patch('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const letter = db.prepare('SELECT * FROM letters WHERE id = ?').get(req.params.id) as { author_id: string } | undefined;
  if (!letter || letter.author_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  const { title, content, mood, isDraft, isShared } = req.body;
  db.prepare(`UPDATE letters SET title=COALESCE(?,title), content=COALESCE(?,content), mood=COALESCE(?,mood),
    is_draft=COALESCE(?,is_draft), is_shared=COALESCE(?,is_shared), updated_at=datetime('now') WHERE id=?
  `).run(title, content, mood, isDraft !== undefined ? (isDraft ? 1 : 0) : null,
    isShared !== undefined ? (isShared ? 1 : 0) : null, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const letter = db.prepare('SELECT * FROM letters WHERE id = ?').get(req.params.id) as { author_id: string } | undefined;
  if (!letter || letter.author_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  db.prepare('DELETE FROM letters WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
