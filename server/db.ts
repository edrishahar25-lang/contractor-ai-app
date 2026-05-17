import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool | null {
  return pool;
}

export async function initDb(): Promise<void> {
  const connStr = process.env.DATABASE_URL;
  if (!connStr) {
    console.warn('[db] DATABASE_URL not set — persistence disabled');
    return;
  }

  pool = new Pool({
    connectionString: connStr,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blueprints (
      id          TEXT PRIMARY KEY,
      filename    TEXT NOT NULL,
      mime_type   TEXT NOT NULL DEFAULT 'image/jpeg',
      status      TEXT NOT NULL DEFAULT 'pending',
      analysis    TEXT,
      uploaded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id           TEXT PRIMARY KEY,
      blueprint_id TEXT,
      data         TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );
  `);

  console.log('[db] PostgreSQL connected');
}
