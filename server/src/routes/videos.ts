import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'videos')),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

router.get('/', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  let query = `SELECT * FROM videos WHERE `;
  const params: string[] = [];
  if (user.username === 'divs') {
    query += `(visibility = 'shared' OR visibility = 'divs_only' OR uploader_id = ?)`;
    params.push(user.id);
  } else {
    query += `(visibility = 'shared' OR visibility = 'manuuu_only' OR uploader_id = ?)`;
    params.push(user.id);
  }
  query += ` ORDER BY created_at DESC`;
  res.json(db.prepare(query).all(...params));
});

router.get('/:id/file', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id) as {
    uploader_id: string; file_path: string; visibility: string; mime_type: string;
  } | undefined;
  if (!video) { res.status(404).json({ error: 'Not found' }); return; }
  if (video.visibility === 'private' && video.uploader_id !== user.id) { res.status(403).json({ error: 'Access denied' }); return; }
  const subPath = video.file_path.startsWith('uploads') ? video.file_path : path.join('uploads', video.file_path);
  const filePath = path.join(__dirname, '..', '..', subPath);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'File not found' }); return; }
  
  // Range request support for video streaming
  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = (end - start) + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': video.mime_type || 'video/mp4',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': video.mime_type || 'video/mp4' });
    fs.createReadStream(filePath).pipe(res);
  }
});

router.post('/', authenticate, upload.single('video'), (req: AuthRequest, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: 'No file' }); return; }
  const user = req.user!;
  const { title, description, visibility } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO videos (id, uploader_id, filename, original_name, file_path, mime_type, size, title, description, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, user.id, req.file.filename, req.file.originalname,
    `uploads/videos/${req.file.filename}`, req.file.mimetype, req.file.size,
    title || req.file.originalname, description || null, visibility || 'shared'
  );
  res.status(201).json({ id });
});

router.delete('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id) as { uploader_id: string; file_path: string } | undefined;
  if (!video || video.uploader_id !== user.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  const fp = path.join(__dirname, '..', '..', video.file_path);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
