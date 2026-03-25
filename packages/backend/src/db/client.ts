import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from './schema.js';

const DB_PATH = resolve(process.cwd(), 'data', 'specflow.db');

export function createDb() {
  // Ensure data directory exists
  mkdirSync(dirname(DB_PATH), { recursive: true });

  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  // Auto-create tables using raw SQL (avoids requiring drizzle-kit push at startup)
  // If DB file is deleted, it gets recreated on next startup
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS features (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      directory TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      activated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pipeline_states (
      id TEXT PRIMARY KEY,
      feature_id TEXT NOT NULL UNIQUE REFERENCES features(id),
      current_stage TEXT NOT NULL DEFAULT 'specify',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transition_history (
      id TEXT PRIMARY KEY,
      feature_id TEXT NOT NULL REFERENCES features(id),
      from_stage TEXT,
      to_stage TEXT NOT NULL,
      direction TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_card_cache (
      id TEXT PRIMARY KEY,
      feature_id TEXT NOT NULL REFERENCES features(id),
      task_id TEXT NOT NULL,
      phase TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      is_parallel INTEGER NOT NULL DEFAULT 0,
      user_story TEXT,
      file_paths TEXT,
      sort_order INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      feature_id TEXT NOT NULL REFERENCES features(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

export type AppDatabase = ReturnType<typeof createDb>;
