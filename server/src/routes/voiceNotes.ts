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
  const visibility = user.username === 'divs' ? 'divs_only' : 'manuuu_only';
  res.json(await db.prepare(`SELECT * FROM voice_notes
    WHERE visibility = 'shared' OR visibility = ? OR uploader_id = ?
    ORDER BY created_at DESC`).all(visibility, user.id));
});

router.get('/:id/file', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const vn = await db.prepare('SELECT * FROM voice_notes WHERE id = ?').get(req.params.id) as {
    file_path: string; mime_type: string; visibility: string; uploader_id: string;
  } | undefined;
  if (!vn) { res.status(404).json({ error: 'Not found' }); return; }
  if (vn.visibility === 'private' && vn.uploader_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }
  if (vn.visibility === 'divs_only' && req.user!.username !== 'divs' && vn.uploader_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }
  if (vn.visibility === 'manuuu_only' && req.user!.username !== 'manuuu' && vn.uploader_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }
  try { res.type(vn.mime_type || 'audio/ogg').send(await downloadMedia(vn.file_path)); }
  catch { res.status(404).json({ error: 'File missing' }); }
});

router.post('/', authenticate, upload.single('audio'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: 'No file' }); return; }
  const user = req.user!;
  const { title, visibility } = req.body;
  const id = uuidv4();
  const filename = `${id}${path.extname(req.file.originalname)}`;
  let filePath: string;
  try { filePath = await uploadMedia('voice-notes', filename, req.file.buffer, req.file.mimetype); }
  catch { res.status(502).json({ error: 'Could not store the voice note' }); return; }
  await db.prepare(`INSERT INTO voice_notes (id, uploader_id, filename, original_name, file_path, mime_type, title, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, user.id, filename, req.file.originalname,
    filePath, req.file.mimetype,
    title || req.file.originalname, visibility || 'shared'
  );
  res.status(201).json({ id });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const vn = await db.prepare('SELECT * FROM voice_notes WHERE id = ?').get(req.params.id) as { uploader_id: string; file_path: string } | undefined;
  if (!vn || vn.uploader_id !== user.id) { res.status(403).json({ error: 'Not allowed' }); return; }
  await deleteMedia(vn.file_path);
  await db.prepare('DELETE FROM voice_notes WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
