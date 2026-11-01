import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isCloudinaryConfigured, uploadToCloudinary, deleteFromCloudinary } from '../cloudinary';

const router = Router();

// Multer: store in memory when using Cloudinary, disk otherwise
const storage = isCloudinaryConfigured()
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'photos')),
      filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
    });

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

// GET /api/photos
router.get('/', authenticate, (req: AuthRequest, res: Response): void => {
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
  res.json(db.prepare(query).all(...params));
});

// GET /api/photos/:id/file — serve file (local) or redirect to Cloudinary URL
router.get('/:id/file', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id) as {
    id: string; uploader_id: string; file_path: string; cloud_url?: string;
    visibility: string; mime_type: string; filename: string;
  } | undefined;

  if (!photo) { res.status(404).json({ error: 'Not found' }); return; }
  if (photo.visibility === 'private' && photo.uploader_id !== user.id) { res.status(403).end(); return; }
  if (photo.visibility === 'divs_only' && user.username !== 'divs' && photo.uploader_id !== user.id) { res.status(403).end(); return; }
  if (photo.visibility === 'manuuu_only' && user.username !== 'manuuu' && photo.uploader_id !== user.id) { res.status(403).end(); return; }

  // If stored on Cloudinary, redirect there
  if (photo.cloud_url) { res.redirect(photo.cloud_url); return; }

  // Local fallback
  const subPath = photo.file_path.startsWith('uploads') ? photo.file_path : path.join('uploads', photo.file_path);
  const filePath = path.join(__dirname, '..', '..', subPath);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'File not on disk' }); return; }
  res.setHeader('Content-Type', photo.mime_type || 'image/jpeg');
  res.sendFile(path.resolve(filePath));
});

// POST /api/photos — upload
router.post('/', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  const user = req.user!;
  const { album = 'gallery', visibility = 'shared', caption } = req.body;
  const id = uuidv4();

  let file_path = '';
  let cloud_url = '';
  let filename = '';

  if (isCloudinaryConfigured() && req.file.buffer) {
    try {
      const result = await uploadToCloudinary(req.file.buffer, id, 'photos', 'image');
      cloud_url = result.url;
      filename = id + path.extname(req.file.originalname);
      file_path = `photos/${filename}`;
    } catch {
      res.status(500).json({ error: 'Cloudinary upload failed' }); return;
    }
  } else {
    filename = (req.file as Express.Multer.File & { filename: string }).filename;
    file_path = `photos/${filename}`;
  }

  db.prepare(`INSERT INTO photos (id, uploader_id, filename, original_name, file_path, cloud_url, mime_type, size, album, visibility, caption)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, user.id, filename, req.file.originalname, file_path, cloud_url || null,
    req.file.mimetype, req.file.size, album, visibility, caption || null);

  res.status(201).json(db.prepare('SELECT * FROM photos WHERE id = ?').get(id));
});

// PATCH /api/photos/:id
router.patch('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id) as { uploader_id: string } | undefined;
  if (!photo) { res.status(404).end(); return; }
  if (photo.uploader_id !== req.user!.id) { res.status(403).end(); return; }
  const { caption, visibility, isFavourite } = req.body;
  if (caption !== undefined) db.prepare('UPDATE photos SET caption = ? WHERE id = ?').run(caption, req.params.id);
  if (visibility !== undefined) db.prepare('UPDATE photos SET visibility = ? WHERE id = ?').run(visibility, req.params.id);
  if (isFavourite !== undefined) db.prepare('UPDATE photos SET is_favourite = ? WHERE id = ?').run(isFavourite ? 1 : 0, req.params.id);
  res.json(db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id));
});

// DELETE /api/photos/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id) as {
    uploader_id: string; file_path: string; cloud_url?: string; filename: string;
  } | undefined;
  if (!photo) { res.status(404).end(); return; }
  if (photo.uploader_id !== req.user!.id) { res.status(403).end(); return; }

  if (photo.cloud_url) {
    const publicId = `our-little-universe/photos/${photo.filename.replace(/\.[^.]+$/, '')}`;
    await deleteFromCloudinary(publicId, 'image');
  } else {
    const subPath = photo.file_path.startsWith('uploads') ? photo.file_path : path.join('uploads', photo.file_path);
    const local = path.join(__dirname, '..', '..', subPath);
    if (fs.existsSync(local)) fs.unlinkSync(local);
  }
  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
