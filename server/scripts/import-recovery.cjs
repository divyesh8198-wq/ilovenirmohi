const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');
const { AwsClient } = require('aws4fetch');
require('tsx/cjs');
const { initDatabase } = require('../src/database.ts');

const recoveryRoot = path.resolve(__dirname, '../../../recovery_bundle/server');
const sourceDb = new DatabaseSync(path.join(recoveryRoot, 'data', 'universe.db'), { readOnly: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });
const endpoint = process.env.AWS_ENDPOINT_URL_S3?.replace(/\/$/, '');
const bucket = process.env.NEON_STORAGE_BUCKET || 'scrapbook-media';
const client = new AwsClient({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  service: 's3',
  region: process.env.AWS_REGION || 'us-east-2',
});
const tableOrder = [
  'users', 'sessions', 'daily_questions', 'photos', 'videos', 'voice_notes', 'memories', 'letters',
  'diary_entries', 'calendar_events', 'date_plans', 'bucket_list', 'question_answers',
  'daily_selfies', 'cycle_tracker', 'countdowns',
];

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function objectUrl(objectPath = '') {
  const safePath = objectPath.split('/').map(encodeURIComponent).join('/');
  return `${endpoint}/${encodeURIComponent(bucket)}${safePath ? `/${safePath}` : ''}`;
}

async function uploadFiles() {
  const uploads = path.join(recoveryRoot, 'uploads');
  const files = listFiles(uploads);
  for (let i = 0; i < files.length; i += 1) {
    const filePath = files[i];
    const objectPath = path.relative(uploads, filePath).split(path.sep).join('/');
    const extension = path.extname(filePath).toLowerCase();
    const contentType = ({
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
      '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    })[extension] || 'application/octet-stream';
    const response = await client.fetch(objectUrl(objectPath), {
      method: 'PUT', body: fs.readFileSync(filePath), headers: { 'content-type': contentType },
    });
    if (!response.ok) throw new Error(`Storage upload failed for an item (${i + 1}/${files.length}): HTTP ${response.status}`);
  }
  console.log(`Uploaded ${files.length} private media files.`);
}

async function importTables() {
  const existing = new Set(sourceDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((row) => row.name));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const table of tableOrder) {
      if (!existing.has(table)) continue;
      const rows = sourceDb.prepare(`SELECT * FROM "${table}"`).all();
      if (!rows.length) continue;
      const columns = Object.keys(rows[0]);
      const primaryKeys = sourceDb.prepare(`PRAGMA table_info("${table}")`).all().filter((col) => col.pk).sort((a, b) => a.pk - b.pk).map((col) => col.name);
      if (!primaryKeys.length) throw new Error(`No primary key found for ${table}`);
      const updates = columns.filter((col) => !primaryKeys.includes(col));
      const sql = `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')}) ON CONFLICT (${primaryKeys.map((c) => `"${c}"`).join(', ')}) ${updates.length ? `DO UPDATE SET ${updates.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')}` : 'DO NOTHING'}`;
      for (const row of rows) await client.query(sql, columns.map((col) => row[col]));
      console.log(`Restored ${rows.length} rows in ${table}.`);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

(async () => {
  for (const name of ['DATABASE_URL', 'AWS_ENDPOINT_URL_S3', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']) {
    if (!process.env[name]) throw new Error(`${name} is required`);
  }
  const bucketCheck = await client.fetch(objectUrl(), { method: 'HEAD' });
  if (!bucketCheck.ok) throw new Error(`Neon Object Storage bucket check failed (HTTP ${bucketCheck.status}); create the private bucket and verify credentials`);
  await initDatabase();
  await uploadFiles();
  await importTables();
  sourceDb.close();
  await pool.end();
})().catch(async (error) => {
  console.error(`Recovery import failed: ${error.message}`);
  sourceDb.close();
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
