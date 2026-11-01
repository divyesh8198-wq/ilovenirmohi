import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get today's question + both answers
router.get('/today', authenticate, (_req: AuthRequest, res: Response): void => {
  const today = new Date().toISOString().split('T')[0];
  const question = db.prepare(`SELECT * FROM daily_questions WHERE asked_date = ?`).get(today) as {
    id: string; question: string; asked_date: string;
  } | undefined;
  if (!question) { res.json(null); return; }
  
  const answers = db.prepare(`SELECT qa.*, u.display_name, u.username FROM question_answers qa
    LEFT JOIN users u ON qa.user_id = u.id WHERE qa.question_id = ?`).all(question.id);
  res.json({ ...question, answers });
});

router.get('/', authenticate, (_req: AuthRequest, res: Response): void => {
  const questions = db.prepare(`SELECT q.*, 
    (SELECT COUNT(*) FROM question_answers WHERE question_id = q.id) as answer_count
    FROM daily_questions q ORDER BY q.asked_date DESC LIMIT 30`).all();
  res.json(questions);
});

// Submit an answer
router.post('/:questionId/answer', authenticate, (req: AuthRequest, res: Response): void => {
  const { answer } = req.body;
  if (!answer) { res.status(400).json({ error: 'Answer required' }); return; }
  const id = uuidv4();
  try {
    db.prepare(`INSERT INTO question_answers (id, question_id, user_id, answer) VALUES (?, ?, ?, ?)`).run(
      id, req.params.questionId, req.user!.id, answer
    );
    res.status(201).json({ id });
  } catch {
    // Update if already answered
    db.prepare(`UPDATE question_answers SET answer = ? WHERE question_id = ? AND user_id = ?`).run(
      answer, req.params.questionId, req.user!.id
    );
    res.json({ message: 'Updated' });
  }
});

// Admin: create a question (either user can)
router.post('/', authenticate, (req: AuthRequest, res: Response): void => {
  const { question, askedDate } = req.body;
  if (!question) { res.status(400).json({ error: 'Question required' }); return; }
  const id = uuidv4();
  const date = askedDate || new Date().toISOString().split('T')[0];
  db.prepare(`INSERT OR REPLACE INTO daily_questions (id, question, asked_date, created_by) VALUES (?, ?, ?, ?)`).run(
    id, question, date, req.user!.username
  );
  res.status(201).json({ id });
});

export default router;
