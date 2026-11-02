import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { deleteMedia, downloadMedia, uploadMedia } from '../storage';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

// GET /api/photos
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { album } = req.query;
  let query = `SELECT * FROM photos WHERE `;
  const params: string[] = [];

  if (user.username === 'divs') {
    query += `(visibility = 'shared' OR visibility = 'divs_only' OR uploader_id = ?)`;
    params.push(user.id);
  } else {
    query += `(visibility = 'shared' OR visibility = 'manuuu_only' OR uploader_id = ?)`;
    params.push(user.id);
  }
  if (album) { query += ` AND album = ?`; params.push(album as string); }
  query += ` ORDER BY created_at DESC`;
  res.json(await db.prepare(query).all(...params));
});

// GET /api/photos/:id/file — serve the authenticated private cloud file
router.get('/:id/file', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const photo = await db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id) as {
    id: string; uploader_id: string; file_path: string;
    visibility: string; mime_type: string; filename: string;
  } | undefined;

  if (!photo) { res.status(404).json({ error: 'Not found' }); return; }
  if (photo.visibility === 'private' && photo.uploader_id !== user.id) { res.status(403).end(); return; }
  if (photo.visibility === 'divs_only' && user.username !== 'divs' && photo.uploader_id !== user.id) { res.status(403).end(); return; }
  if (photo.visibility === 'manuuu_only' && user.username !== 'manuuu' && photo.uploader_id !== user.id) { res.status(403).end(); return; }

  try {
    res.type(photo.mime_type || 'application/octet-stream').send(await downloadMedia(photo.file_path));
  } catch {
    res.status(404).json({ error: 'File not found' });
  }
});

// POST /api/photos — upload
router.post('/', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  const user = req.user!;
  const { album = 'gallery', visibility = 'shared', caption } = req.body;
  const id = uuidv4();

  const filename = `${id}${path.extname(req.file.originalname)}`;
  let file_path: string;
  try {
    file_path = await uploadMedia('photos', filename, req.file.buffer, req.file.mimetype);
  } catch {
    res.status(502).json({ error: 'Could not store the photo' });
    return;
  }

  await db.prepare(`INSERT INTO photos (id, uploader_id, filename, original_name, file_path, cloud_url, mime_type, size, album, visibility, caption)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, user.id, filename, req.file.originalname, file_path, null,
    req.file.mimetype, req.file.size, album, visibility, caption || null);

  res.status(201).json(await db.prepare('SELECT * FROM photos WHERE id = ?').get(id));
});

// PATCH /api/photos/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const photo = await db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id) as { uploader_id: string } | undefined;
  if (!photo) { res.status(404).end(); return; }
  if (photo.uploader_id !== req.user!.id) { res.status(403).end(); return; }
  const { caption, visibility, isFavourite } = req.body;
  if (caption !== undefined) await db.prepare('UPDATE photos SET caption = ? WHERE id = ?').run(caption, req.params.id);
  if (visibility !== undefined) await db.prepare('UPDATE photos SET visibility = ? WHERE id = ?').run(visibility, req.params.id);
  if (isFavourite !== undefined) await db.prepare('UPDATE photos SET is_favourite = ? WHERE id = ?').run(isFavourite ? 1 : 0, req.params.id);
  res.json(await db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id));
});

// DELETE /api/photos/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const photo = await db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id) as {
    uploader_id: string; file_path: string;
  } | undefined;
  if (!photo) { res.status(404).end(); return; }
  if (photo.uploader_id !== req.user!.id) { res.status(403).end(); return; }

  await deleteMedia(photo.file_path);
  await db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
