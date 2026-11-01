import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/sleep/status — current sleep status of both users
router.get('/status', authenticate, (_req: AuthRequest, res: Response): void => {
  const users = db.prepare('SELECT id, username, display_name FROM users').all() as {
    id: string; username: string; display_name: string;
  }[];

  const result: Record<string, unknown> = {};

  for (const u of users) {
    const latest = db.prepare(`SELECT * FROM sleep_tracker WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`).get(u.id) as {
      id: string; is_sleeping: number; fell_asleep_at: string; woke_up_at: string;
      duration_minutes: number; sleep_quality: string; bedside_note: string;
    } | undefined;

    result[u.username] = {
      user: { id: u.id, username: u.username, displayName: u.display_name },
      isSleeping: latest?.is_sleeping === 1,
      fellAsleepAt: latest?.is_sleeping === 1 ? latest.fell_asleep_at : null,
      lastWokeUpAt: latest?.woke_up_at || null,
      lastDuration: latest?.duration_minutes || null,
      bedsideNote: latest?.bedside_note || null,
    };
  }

  res.json(result);
});

// POST /api/sleep/toggle — switch between awake and sleeping
router.post('/toggle', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const { quality } = req.body;

  const current = db.prepare(`SELECT * FROM sleep_tracker WHERE user_id = ? AND is_sleeping = 1 ORDER BY created_at DESC LIMIT 1`).get(user.id) as {
    id: string; fell_asleep_at: string;
  } | undefined;

  const now = new Date().toISOString();

  if (current) {
    // Waking up
    const fell = new Date(current.fell_asleep_at).getTime();
    const woke = new Date(now).getTime();
    const duration = Math.max(1, Math.round((woke - fell) / (1000 * 60)));

    db.prepare(`UPDATE sleep_tracker SET is_sleeping = 0, woke_up_at = ?, duration_minutes = ?, sleep_quality = ? WHERE id = ?`).run(
      now, duration, quality || 'peaceful', current.id
    );

    res.json({ status: 'awake', durationMinutes: duration, wokeUpAt: now });
  } else {
    // Going to sleep
    const id = uuidv4();
    db.prepare(`INSERT INTO sleep_tracker (id, user_id, is_sleeping, fell_asleep_at) VALUES (?, ?, 1, ?)`).run(
      id, user.id, now
    );

    res.json({ status: 'sleeping', fellAsleepAt: now });
  }
});

// POST /api/sleep/note — leave a cute bedside note for sleeping partner
router.post('/note', authenticate, (req: AuthRequest, res: Response): void => {
  const { note } = req.body;
  if (!note) { res.status(400).json({ error: 'Note required' }); return; }

  // Find partner
  const partner = db.prepare('SELECT id FROM users WHERE id != ?').get(req.user!.id) as { id: string } | undefined;
  if (!partner) { res.status(404).json({ error: 'Partner not found' }); return; }

  const sleeping = db.prepare(`SELECT id FROM sleep_tracker WHERE user_id = ? AND is_sleeping = 1 ORDER BY created_at DESC LIMIT 1`).get(partner.id) as { id: string } | undefined;

  if (sleeping) {
    db.prepare(`UPDATE sleep_tracker SET bedside_note = ? WHERE id = ?`).run(note, sleeping.id);
  }

  res.json({ message: 'Bedside note tucked in! 💌' });
});

// GET /api/sleep/history — last logs
router.get('/history', authenticate, (_req: AuthRequest, res: Response): void => {
  const history = db.prepare(`SELECT st.*, u.display_name, u.username FROM sleep_tracker st
    LEFT JOIN users u ON st.user_id = u.id
    WHERE st.woke_up_at IS NOT NULL
    ORDER BY st.created_at DESC LIMIT 14`).all();
  res.json(history);
});

export default router;
