import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// STRICTLY private to manuuu
function requireManuuu(req: AuthRequest, res: Response): boolean {
  if (req.user?.username !== 'manuuu') {
    res.status(403).json({ error: 'This is private to Manuuu 🔒' });
    return false;
  }
  return true;
}

// Get cycles — only manuuu's data, only accessible to manuuu
router.get('/', authenticate, (req: AuthRequest, res: Response): void => {
  if (!requireManuuu(req, res)) return;
  res.json(db.prepare(`SELECT * FROM cycle_tracker WHERE user_id = ? ORDER BY period_start DESC`).all(req.user!.id));
});

// Get shared summary (if manuuu chose to share)
router.get('/shared-summary', authenticate, (_req: AuthRequest, res: Response): void => {
  const manuuu = db.prepare(`SELECT id FROM users WHERE username = 'manuuu'`).get() as { id: string } | undefined;
  if (!manuuu) { res.json(null); return; }
  const latest = db.prepare(`SELECT period_start, cycle_length, share_with_partner FROM cycle_tracker
    WHERE user_id = ? AND share_with_partner = 1 ORDER BY period_start DESC LIMIT 1`).get(manuuu.id) as {
    period_start: string; cycle_length: number; share_with_partner: number;
  } | undefined;
  if (!latest) { res.json(null); return; }
  // Only share predicted next date, not details
  const nextDate = new Date(latest.period_start);
  nextDate.setDate(nextDate.getDate() + (latest.cycle_length || 28));
  res.json({ nextPredicted: nextDate.toISOString().split('T')[0] });
});

router.post('/', authenticate, (req: AuthRequest, res: Response): void => {
  if (!requireManuuu(req, res)) return;
  const { periodStart, periodEnd, cycleLength, flowLevel, symptoms, mood, notes, shareWithPartner } = req.body;
  if (!periodStart) { res.status(400).json({ error: 'Period start date required' }); return; }
  const id = uuidv4();
  db.prepare(`INSERT INTO cycle_tracker (id, user_id, period_start, period_end, cycle_length, flow_level, symptoms, mood, notes, share_with_partner)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, req.user!.id, periodStart, periodEnd || null, cycleLength || null,
    flowLevel || null, JSON.stringify(symptoms || []), mood || null,
    notes || null, shareWithPartner ? 1 : 0
  );
  res.status(201).json({ id });
});

router.patch('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  if (!requireManuuu(req, res)) return;
  const cycle = db.prepare('SELECT * FROM cycle_tracker WHERE id = ?').get(req.params.id) as { user_id: string } | undefined;
  if (!cycle || cycle.user_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  const { periodEnd, cycleLength, flowLevel, symptoms, mood, notes, shareWithPartner } = req.body;
  db.prepare(`UPDATE cycle_tracker SET period_end=COALESCE(?,period_end), cycle_length=COALESCE(?,cycle_length),
    flow_level=COALESCE(?,flow_level), symptoms=COALESCE(?,symptoms), mood=COALESCE(?,mood),
    notes=COALESCE(?,notes), share_with_partner=COALESCE(?,share_with_partner) WHERE id=?`).run(
    periodEnd, cycleLength, flowLevel, symptoms ? JSON.stringify(symptoms) : null,
    mood, notes, shareWithPartner !== undefined ? (shareWithPartner ? 1 : 0) : null, req.params.id
  );
  res.json({ message: 'Updated' });
});

router.delete('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  if (!requireManuuu(req, res)) return;
  const cycle = db.prepare('SELECT * FROM cycle_tracker WHERE id = ?').get(req.params.id) as { user_id: string } | undefined;
  if (!cycle || cycle.user_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  db.prepare('DELETE FROM cycle_tracker WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
