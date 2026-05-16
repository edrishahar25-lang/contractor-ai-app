import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data/contractor.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized — call initDb() first');
  return db;
}

export function initDb(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS blueprints (
      id          TEXT PRIMARY KEY,
      filename    TEXT NOT NULL,
      mime_type   TEXT NOT NULL DEFAULT 'image/jpeg',
      status      TEXT NOT NULL DEFAULT 'pending',
      analysis    TEXT,
      uploaded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      blueprint_id TEXT REFERENCES blueprints(id),
      data        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `);

  console.log('[db] initialized:', DB_PATH);
}
