import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';

const router = Router();

// POST /api/seed — import all media from manuuuuu folder and create accounts
// This is a one-time setup endpoint, no auth required for initial seeding
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { adminKey } = req.body;
  if (adminKey !== 'our-little-universe-setup-2026') {
    res.status(403).json({ error: 'Invalid admin key' });
    return;
  }

  const results: string[] = [];
  const SOURCE = 'C:\\Users\\divye\\Downloads\\manuuuuu';
  const UPLOADS = path.join(__dirname, '..', '..', 'uploads');

  // Copy photos from Nirmohiiii
  const nirmoFolder = path.join(SOURCE, 'Nirmohiiii');
  if (fs.existsSync(nirmoFolder)) {
    const files = fs.readdirSync(nirmoFolder);
    for (const file of files) {
      const src = path.join(nirmoFolder, file);
      const ext = path.extname(file);
      const newName = `seeded-${uuidv4()}${ext}`;
      const dest = path.join(UPLOADS, 'photos', newName);
      fs.copyFileSync(src, dest);

      const id = uuidv4();
      // Find uploader (manuuu)
      const uploader = db.prepare(`SELECT id FROM users WHERE username = 'manuuu'`).get() as { id: string } | undefined;
      if (uploader) {
        db.prepare(`INSERT OR IGNORE INTO photos (id, uploader_id, album, filename, original_name, file_path, mime_type, visibility)
          VALUES (?, ?, 'gallery', ?, ?, ?, ?, 'shared')`).run(
          id, uploader.id, newName, file, `uploads/photos/${newName}`,
          ext === '.png' ? 'image/png' : 'image/jpeg'
        );
        results.push(`Imported gallery photo: ${file}`);
      }
    }
  }

  // Copy childhood photos
  const childhoodFolder = path.join(SOURCE, 'childhood');
  if (fs.existsSync(childhoodFolder)) {
    const files = fs.readdirSync(childhoodFolder);
    for (const file of files) {
      const src = path.join(childhoodFolder, file);
      const ext = path.extname(file);
      const newName = `seeded-${uuidv4()}${ext}`;
      const dest = path.join(UPLOADS, 'photos', newName);
      fs.copyFileSync(src, dest);

      const id = uuidv4();
      const uploader = db.prepare(`SELECT id FROM users WHERE username = 'manuuu'`).get() as { id: string } | undefined;
      if (uploader) {
        db.prepare(`INSERT OR IGNORE INTO photos (id, uploader_id, album, filename, original_name, file_path, mime_type, visibility)
          VALUES (?, ?, 'childhood', ?, ?, ?, ?, 'shared')`).run(
          id, uploader.id, newName, file, `uploads/photos/${newName}`, 'image/jpeg'
        );
        results.push(`Imported childhood photo: ${file}`);
      }
    }
  }

  // Copy videos
  const videosFolder = path.join(SOURCE, 'her videos');
  if (fs.existsSync(videosFolder)) {
    const files = fs.readdirSync(videosFolder);
    for (const file of files) {
      const src = path.join(videosFolder, file);
      const ext = path.extname(file);
      const newName = `seeded-${uuidv4()}${ext}`;
      const dest = path.join(UPLOADS, 'videos', newName);
      fs.copyFileSync(src, dest);

      const id = uuidv4();
      const uploader = db.prepare(`SELECT id FROM users WHERE username = 'manuuu'`).get() as { id: string } | undefined;
      if (uploader) {
        db.prepare(`INSERT OR IGNORE INTO videos (id, uploader_id, filename, original_name, file_path, mime_type, title, visibility)
          VALUES (?, ?, ?, ?, ?, 'video/mp4', ?, 'shared')`).run(
          id, uploader.id, newName, file, `uploads/videos/${newName}`, file.replace(/\.[^.]+$/, '')
        );
        results.push(`Imported video: ${file}`);
      }
    }
  }

  // Copy voice notes
  const voiceFolder = path.join(SOURCE, 'voice notes');
  if (fs.existsSync(voiceFolder)) {
    const files = fs.readdirSync(voiceFolder);
    for (const file of files) {
      const src = path.join(voiceFolder, file);
      const ext = path.extname(file);
      const newName = `seeded-${uuidv4()}${ext}`;
      const dest = path.join(UPLOADS, 'voice-notes', newName);
      fs.copyFileSync(src, dest);

      const id = uuidv4();
      const uploader = db.prepare(`SELECT id FROM users WHERE username = 'manuuu'`).get() as { id: string } | undefined;
      if (uploader) {
        db.prepare(`INSERT OR IGNORE INTO voice_notes (id, uploader_id, filename, original_name, file_path, mime_type, title, visibility)
          VALUES (?, ?, ?, ?, ?, 'audio/ogg', ?, 'shared')`).run(
          id, uploader.id, newName, file, `uploads/voice-notes/${newName}`, file.replace(/\.[^.]+$/, '')
        );
        results.push(`Imported voice note: ${file}`);
      }
    }
  }

  res.json({ message: 'Seed complete!', imported: results.length, details: results });
});

export default router;
