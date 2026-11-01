import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initDatabase } from './database';

dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import photosRoutes from './routes/photos';
import videosRoutes from './routes/videos';
import voiceNotesRoutes from './routes/voiceNotes';
import memoriesRoutes from './routes/memories';
import lettersRoutes from './routes/letters';
import diaryRoutes from './routes/diary';
import calendarRoutes from './routes/calendar';
import datePlansRoutes from './routes/datePlans';
import bucketListRoutes from './routes/bucketList';
import questionsRoutes from './routes/questions';
import selfiesRoutes from './routes/selfies';
import cycleRoutes from './routes/cycle';
import countdownsRoutes from './routes/countdowns';
import seedRoutes from './routes/seed';

const app = express();
const PORT = process.env.PORT || 4000;

// Ensure media directories exist
const MEDIA_DIRS = [
  'uploads/photos',
  'uploads/videos',
  'uploads/voice-notes',
  'uploads/selfies',
  'uploads/avatars',
];
MEDIA_DIRS.forEach((dir) => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Initialize database
initDatabase();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve uploaded media with auth-aware middleware (photos served via API routes for privacy)
// Public static: only serve avatars without auth
app.use('/uploads/avatars', express.static(path.join(__dirname, '..', 'uploads', 'avatars')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/voice-notes', voiceNotesRoutes);
app.use('/api/memories', memoriesRoutes);
app.use('/api/letters', lettersRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/date-plans', datePlansRoutes);
app.use('/api/bucket-list', bucketListRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/selfies', selfiesRoutes);
app.use('/api/cycle', cycleRoutes);
app.use('/api/countdowns', countdownsRoutes);
app.use('/api/seed', seedRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Our Little Universe API ✦', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✦ Our Little Universe API running on http://localhost:${PORT}`);
});

export default app;
