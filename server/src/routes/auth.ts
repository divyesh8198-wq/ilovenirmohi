import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { getJwtSecret, matchesSecret } from '../security';

const router = Router();
const JWT_EXPIRES = '30d';

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, displayName, password } = req.body || {};

  if (!matchesSecret(req.body?.inviteCode, process.env.REGISTRATION_KEY)) {
    res.status(403).json({ error: 'A valid private registration code is required' });
    return;
  }

  if (typeof username !== 'string' || !username || typeof password !== 'string' || password.length < 12 || password.length > 128) {
    res.status(400).json({ error: 'Username and a password between 12 and 128 characters are required' });
    return;
  }

  // Only allow divs and manuuu
  if (!['divs', 'manuuu'].includes(username.toLowerCase())) {
    res.status(403).json({ error: 'Registration is private. Only Divs and Manuuu can join. 💗' });
    return;
  }

  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
  if (existing) {
    res.status(409).json({ error: 'This account already exists' });
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const id = uuidv4();

  await db.prepare(`
    INSERT INTO users (id, username, display_name, password_hash)
    VALUES (?, ?, ?, ?)
  `).run(id, username.toLowerCase(), displayName || username, hash);

  const token = jwt.sign(
    { id, username: username.toLowerCase(), displayName: displayName || username },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES }
  );

  res.status(201).json({
    token,
    user: { id, username: username.toLowerCase(), displayName: displayName || username },
  });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase()) as {
    id: string;
    username: string;
    display_name: string;
    password_hash: string;
  } | undefined;

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, displayName: user.display_name },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.display_name },
  });
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token' });
    return;
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), getJwtSecret()) as {
      id: string; username: string; displayName: string;
    };
    const user = await db.prepare('SELECT id, username, display_name, avatar_path, created_at FROM users WHERE id = ?').get(decoded.id) as {
      id: string; username: string; display_name: string; avatar_path: string | null; created_at: string;
    } | undefined;
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ id: user.id, username: user.username, displayName: user.display_name, avatarPath: user.avatar_path, createdAt: user.created_at });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
