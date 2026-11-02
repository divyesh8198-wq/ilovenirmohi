import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database';
import { initializeMediaStorage } from './storage';
import { getJwtSecret } from './security';

dotenv.config();

// database imports storage.ts, which loads server/.env before route modules read settings.
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
import locationRoutes from './routes/location';
import sleepRoutes from './routes/sleep';

const app = express();
const PORT = process.env.PORT || 4000;
getJwtSecret(); // Fail at startup instead of running with a known or missing signing key.

// Middleware
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173,http://localhost:3000')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use((_req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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
app.use('/api/location', locationRoutes);
app.use('/api/sleep', sleepRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Our Little Universe API ✦', time: new Date().toISOString() });
});

async function startServer(): Promise<void> {
  await initDatabase();
  await initializeMediaStorage();
  app.listen(PORT, () => {
    console.log(`✦ Our Little Universe running on port ${PORT}`);
  });
}

void startServer().catch((error) => {
  console.error('Could not start Our Little Universe:', error);
  process.exit(1);
});

export default app;
