import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'universe.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Sessions (JWT blacklist for logout)
    CREATE TABLE IF NOT EXISTS sessions (
      token_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Photos / Media
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      uploader_id TEXT NOT NULL,
      album TEXT NOT NULL DEFAULT 'gallery',
      filename TEXT NOT NULL,
      original_name TEXT,
      file_path TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      caption TEXT,
      taken_at TEXT,
      visibility TEXT DEFAULT 'shared',  -- 'private', 'shared', 'divs_only', 'manuuu_only'
      is_favourite INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    );

    -- Videos
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      uploader_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT,
      file_path TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      title TEXT,
      description TEXT,
      thumbnail_path TEXT,
      visibility TEXT DEFAULT 'shared',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    );

    -- Voice Notes
    CREATE TABLE IF NOT EXISTS voice_notes (
      id TEXT PRIMARY KEY,
      uploader_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT,
      file_path TEXT NOT NULL,
      mime_type TEXT,
      duration INTEGER,
      title TEXT,
      visibility TEXT DEFAULT 'shared',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    );

    -- Memory Timeline
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      event_date TEXT NOT NULL,
      photo_ids TEXT DEFAULT '[]',  -- JSON array
      visibility TEXT DEFAULT 'shared',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    -- Love Letters
    CREATE TABLE IF NOT EXISTS letters (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      recipient_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_draft INTEGER DEFAULT 1,
      is_shared INTEGER DEFAULT 0,
      mood TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id)
    );

    -- Diary Entries (completely private)
    CREATE TABLE IF NOT EXISTS diary_entries (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      mood TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    -- Calendar Events
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      event_date TEXT NOT NULL,
      event_time TEXT,
      category TEXT DEFAULT 'general',
      color TEXT DEFAULT '#f4a5c4',
      is_recurring INTEGER DEFAULT 0,
      recurrence_rule TEXT,
      visibility TEXT DEFAULT 'shared',
      reminder_days INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    -- Date Plans
    CREATE TABLE IF NOT EXISTS date_plans (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      planned_date TEXT,
      location TEXT,
      budget REAL,
      status TEXT DEFAULT 'idea',  -- 'idea', 'planned', 'done'
      photos TEXT DEFAULT '[]',
      rating INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    -- Bucket List
    CREATE TABLE IF NOT EXISTS bucket_list (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'experience',
      priority INTEGER DEFAULT 3,
      is_completed INTEGER DEFAULT 0,
      completed_at TEXT,
      photo_path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    -- Daily Questions
    CREATE TABLE IF NOT EXISTS daily_questions (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      asked_date TEXT NOT NULL,
      created_by TEXT DEFAULT 'system'
    );

    CREATE TABLE IF NOT EXISTS question_answers (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (question_id) REFERENCES daily_questions(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(question_id, user_id)
    );

    -- Daily Selfies
    CREATE TABLE IF NOT EXISTS daily_selfies (
      id TEXT PRIMARY KEY,
      uploader_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      selfie_date TEXT NOT NULL,
      caption TEXT,
      is_public INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (uploader_id) REFERENCES users(id),
      UNIQUE(uploader_id, selfie_date)
    );

    -- Menstrual Cycle (private to manuuu)
    CREATE TABLE IF NOT EXISTS cycle_tracker (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT,
      cycle_length INTEGER,
      flow_level TEXT,  -- 'light', 'medium', 'heavy'
      symptoms TEXT DEFAULT '[]',
      mood TEXT,
      notes TEXT,
      share_with_partner INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Countdowns
    CREATE TABLE IF NOT EXISTS countdowns (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      title TEXT NOT NULL,
      target_date TEXT NOT NULL,
      category TEXT DEFAULT 'anniversary',
      emoji TEXT DEFAULT '💗',
      is_recurring INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    -- Sleep Tracker
    CREATE TABLE IF NOT EXISTS sleep_tracker (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      is_sleeping INTEGER DEFAULT 0,
      fell_asleep_at TEXT,
      woke_up_at TEXT,
      duration_minutes INTEGER,
      sleep_quality TEXT,
      bedside_note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Location Tracker
    CREATE TABLE IF NOT EXISTS location_tracker (
      user_id TEXT PRIMARY KEY,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      place_name TEXT,
      status_text TEXT,
      battery_level INTEGER,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Ensure default accounts and starter data exist (for fresh deployments like Render)
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (userCount.c === 0) {
    const divsId = uuidv4();
    const manuuuId = uuidv4();
    const divsHash = bcrypt.hashSync('091207', 12);
    const manuuuHash = bcrypt.hashSync('010808', 12);

    db.prepare(`INSERT INTO users (id, username, display_name, password_hash) VALUES (?, 'divs', 'Divs 💖', ?)`).run(divsId, divsHash);
    db.prepare(`INSERT INTO users (id, username, display_name, password_hash) VALUES (?, 'manuuu', 'Manuuu 🌸', ?)`).run(manuuuId, manuuuHash);

    // Starter countdowns
    const cds = [
      { title: "One Month Anniversary 💗", date: "2026-11-21", cat: "anniversary", emoji: "💍" },
      { title: "Divs's Birthday 🎂", date: "2026-12-09", cat: "birthday", emoji: "🎂" },
      { title: "New Year Together 2027 ✨", date: "2027-01-01", cat: "special", emoji: "🎉" },
      { title: "Manuuu's Birthday 🌸", date: "2027-08-01", cat: "birthday", emoji: "🎀" },
      { title: "1 Year Anniversary 💍", date: "2027-10-21", cat: "anniversary", emoji: "💖" },
    ];
    for (const cd of cds) {
      db.prepare(`INSERT INTO countdowns (id, creator_id, title, target_date, category, emoji) VALUES (?, ?, ?, ?, ?, ?)`).run(uuidv4(), divsId, cd.title, cd.date, cd.cat, cd.emoji);
    }

    // Starter questions
    const questions = [
      "What was your very first thought when we met at 8:56 PM on 24 Sep? 🌸",
      "What is your favorite memory of us so far? 💗",
      "If we could go on an impromptu late-night drive right now, where to? 🌙",
      "What is one little habit of mine that makes you smile? ✨",
      "What song always reminds you of us? 🎵",
      "What is your dream date that we haven't done yet? 🌹",
      "What made you realize you had feelings for me? 💓"
    ];
    const today = new Date();
    for (let i = 0; i < questions.length; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      db.prepare(`INSERT INTO daily_questions (id, question, asked_date, created_by) VALUES (?, ?, ?, 'divs')`).run(uuidv4(), questions[i], dateStr);
    }
  }

  console.log('✓ Database initialized at:', DB_PATH);
}

export default db;
