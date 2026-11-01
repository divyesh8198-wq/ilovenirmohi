import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'voice-notes')),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/', authenticate, (_req: AuthRequest, res: Response): void => {
  res.json(db.prepare(`SELECT * FROM voice_notes WHERE visibility != 'private' ORDER BY created_at DESC`).all());
});

router.get('/:id/file', authenticate, (req: AuthRequest, res: Response): void => {
  const vn = db.prepare('SELECT * FROM voice_notes WHERE id = ?').get(req.params.id) as {
    file_path: string; mime_type: string; visibility: string; uploader_id: string;
  } | undefined;
  if (!vn) { res.status(404).json({ error: 'Not found' }); return; }
  const subPath = vn.file_path.startsWith('uploads') ? vn.file_path : path.join('uploads', vn.file_path);
  const filePath = path.join(__dirname, '..', '..', subPath);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'File missing' }); return; }
  res.setHeader('Content-Type', vn.mime_type || 'audio/ogg');
  res.sendFile(path.resolve(filePath));
});

router.post('/', authenticate, upload.single('audio'), (req: AuthRequest, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: 'No file' }); return; }
  const user = req.user!;
  const { title, visibility } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO voice_notes (id, uploader_id, filename, original_name, file_path, mime_type, title, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, user.id, req.file.filename, req.file.originalname,
    `uploads/voice-notes/${req.file.filename}`, req.file.mimetype,
    title || req.file.originalname, visibility || 'shared'
  );
  res.status(201).json({ id });
});

router.delete('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const vn = db.prepare('SELECT * FROM voice_notes WHERE id = ?').get(req.params.id) as { uploader_id: string; file_path: string } | undefined;
  if (!vn || vn.uploader_id !== user.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  const fp = path.join(__dirname, '..', '..', vn.file_path);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  db.prepare('DELETE FROM voice_notes WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
