import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'selfies')),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Only see your own selfies (private archive)
router.get('/', authenticate, (req: AuthRequest, res: Response): void => {
  res.json(db.prepare(`SELECT * FROM daily_selfies WHERE uploader_id = ? ORDER BY selfie_date DESC`).all(req.user!.id));
});

// See public selfies from partner
router.get('/public', authenticate, (req: AuthRequest, res: Response): void => {
  res.json(db.prepare(`SELECT ds.*, u.display_name FROM daily_selfies ds
    LEFT JOIN users u ON ds.uploader_id = u.id
    WHERE ds.is_public = 1 ORDER BY ds.selfie_date DESC`).all());
});

router.get('/:id/file', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const selfie = db.prepare('SELECT * FROM daily_selfies WHERE id = ?').get(req.params.id) as {
    uploader_id: string; file_path: string; is_public: number;
  } | undefined;
  if (!selfie) { res.status(404).json({ error: 'Not found' }); return; }
  if (selfie.uploader_id !== user.id && !selfie.is_public) { res.status(403).json({ error: 'Private selfie' }); return; }
  const filePath = path.join(__dirname, '..', '..', selfie.file_path);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'File missing' }); return; }
  res.sendFile(path.resolve(filePath));
});

router.post('/', authenticate, upload.single('selfie'), (req: AuthRequest, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: 'No file' }); return; }
  const user = req.user!;
  const { caption, isPublic } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const id = uuidv4();
  try {
    db.prepare(`INSERT INTO daily_selfies (id, uploader_id, filename, file_path, selfie_date, caption, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      id, user.id, req.file.filename, `uploads/selfies/${req.file.filename}`,
      today, caption || null, isPublic === 'true' ? 1 : 0
    );
    res.status(201).json({ id });
  } catch {
    res.status(409).json({ error: 'You already uploaded today\'s selfie' });
  }
});

router.patch('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const selfie = db.prepare('SELECT * FROM daily_selfies WHERE id = ?').get(req.params.id) as { uploader_id: string } | undefined;
  if (!selfie || selfie.uploader_id !== req.user!.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  const { caption, isPublic } = req.body;
  db.prepare(`UPDATE daily_selfies SET caption=COALESCE(?,caption), is_public=COALESCE(?,is_public) WHERE id=?`).run(
    caption, isPublic !== undefined ? (isPublic ? 1 : 0) : null, req.params.id
  );
  res.json({ message: 'Updated' });
});

export default router;
