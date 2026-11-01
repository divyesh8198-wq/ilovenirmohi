import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, (_req: AuthRequest, res: Response): void => {
  res.json(db.prepare(`SELECT e.*, u.display_name as creator_name FROM calendar_events e
    LEFT JOIN users u ON e.creator_id = u.id
    WHERE e.visibility = 'shared' ORDER BY e.event_date ASC`).all());
});

router.post('/', authenticate, (req: AuthRequest, res: Response): void => {
  const { title, description, eventDate, event_date, eventTime, event_time, category, color, isRecurring, recurrenceRule, visibility, reminderDays } = req.body;
  const date = eventDate || event_date;
  const time = eventTime || event_time || null;
  if (!title || !date) { res.status(400).json({ error: 'Title and date required' }); return; }
  const id = uuidv4();
  db.prepare(`INSERT INTO calendar_events (id, creator_id, title, description, event_date, event_time, category, color, is_recurring, recurrence_rule, visibility, reminder_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, req.user!.id, title, description || null, date, time,
    category || 'general', color || '#f4a5c4', isRecurring ? 1 : 0,
    recurrenceRule || null, visibility || 'shared', reminderDays || 1
  );
  res.status(201).json({ id });
});

router.patch('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const ev = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(req.params.id) as { creator_id: string } | undefined;
  if (!ev || ev.creator_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  const { title, description, eventDate, eventTime, category, color, visibility } = req.body;
  db.prepare(`UPDATE calendar_events SET title=COALESCE(?,title), description=COALESCE(?,description),
    event_date=COALESCE(?,event_date), event_time=COALESCE(?,event_time), category=COALESCE(?,category),
    color=COALESCE(?,color), visibility=COALESCE(?,visibility) WHERE id=?
  `).run(title, description, eventDate, eventTime, category, color, visibility, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const ev = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(req.params.id) as { creator_id: string } | undefined;
  if (!ev || ev.creator_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  db.prepare('DELETE FROM calendar_events WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
