import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { deleteMedia, downloadMedia, uploadMedia } from '../storage';

const router = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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
  res.json(await db.prepare(query).all(...params));
});

router.get('/:id/file', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const video = await db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id) as {
    uploader_id: string; file_path: string; visibility: string; mime_type: string;
  } | undefined;
  if (!video) { res.status(404).json({ error: 'Not found' }); return; }
  if (video.visibility === 'private' && video.uploader_id !== user.id) { res.status(403).json({ error: 'Access denied' }); return; }
  if (video.visibility === 'divs_only' && user.username !== 'divs' && video.uploader_id !== user.id) { res.status(403).json({ error: 'Access denied' }); return; }
  if (video.visibility === 'manuuu_only' && user.username !== 'manuuu' && video.uploader_id !== user.id) { res.status(403).json({ error: 'Access denied' }); return; }
  let file: Buffer;
  try { file = await downloadMedia(video.file_path); }
  catch { res.status(404).json({ error: 'File not found' }); return; }

  // Range requests let the browser seek within the private video.
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = Math.min(parts[1] ? parseInt(parts[1], 10) : file.length - 1, file.length - 1);
    if (!Number.isFinite(start) || start < 0 || start > end) { res.status(416).end(); return; }
    const chunksize = (end - start) + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${file.length}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': video.mime_type || 'video/mp4',
    });
    res.end(file.subarray(start, end + 1));
  } else {
    res.writeHead(200, { 'Content-Length': file.length, 'Accept-Ranges': 'bytes', 'Content-Type': video.mime_type || 'video/mp4' });
    res.end(file);
  }
});

router.post('/', authenticate, upload.single('video'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: 'No file' }); return; }
  const user = req.user!;
  const { title, description, visibility } = req.body;
  const id = uuidv4();
  const filename = `${id}${path.extname(req.file.originalname)}`;
  let filePath: string;
  try { filePath = await uploadMedia('videos', filename, req.file.buffer, req.file.mimetype); }
  catch { res.status(502).json({ error: 'Could not store the video' }); return; }
  await db.prepare(`INSERT INTO videos (id, uploader_id, filename, original_name, file_path, mime_type, size, title, description, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, user.id, filename, req.file.originalname,
    filePath, req.file.mimetype, req.file.size,
    title || req.file.originalname, description || null, visibility || 'shared'
  );
  res.status(201).json({ id });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const video = await db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id) as { uploader_id: string; file_path: string } | undefined;
  if (!video || video.uploader_id !== user.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  await deleteMedia(video.file_path);
  await db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
