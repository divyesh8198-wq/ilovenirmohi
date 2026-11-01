import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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

  console.log('✓ Database initialized at:', DB_PATH);
}

export default db;
