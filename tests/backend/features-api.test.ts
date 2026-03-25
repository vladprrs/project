import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../packages/backend/src/db/schema';
import { FeatureService } from '../../packages/backend/src/services/feature';
import { createFeaturesRouter } from '../../packages/backend/src/api/features';

let server: Server;
let port: number;
let sqlite: InstanceType<typeof Database>;

function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
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

// Setup server once
const setupPromise = new Promise<void>((resolve) => {
  sqlite = createTestDb();
  const db = drizzle(sqlite, { schema });
  const featureService = new FeatureService(db);

  const app = express();
  app.use(express.json());
  app.use('/api/features', createFeaturesRouter(featureService));

  server = createServer(app);
  server.listen(0, () => {
    const addr = server.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
    resolve();
  });
});

beforeEach(async () => {
  await setupPromise;
  // Clean tables between tests
  sqlite.exec('DELETE FROM transition_history;');
  sqlite.exec('DELETE FROM pipeline_states;');
  sqlite.exec('DELETE FROM task_card_cache;');
  sqlite.exec('DELETE FROM chat_messages;');
  sqlite.exec('DELETE FROM features;');
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  if (sqlite) {
    sqlite.close();
  }
});

function url(path: string): string {
  return `http://localhost:${port}${path}`;
}

describe('features API', () => {
  it('GET /active returns null when no feature active', async () => {
    const res = await fetch(url('/api/features/active'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.feature).toBeNull();
  });

  it('POST /activate creates and returns feature', async () => {
    const res = await fetch(url('/api/features/activate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-feat', directory: '/test' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.feature).toBeDefined();
    expect(body.feature.name).toBe('test-feat');
    expect(body.feature.isActive).toBe(true);
    expect(body.feature.id).toBeDefined();
  });

  it('POST /activate returns 409 when feature already active', async () => {
    // Activate first feature
    await fetch(url('/api/features/activate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'first', directory: '/first' }),
    });

    // Try activating second
    const res = await fetch(url('/api/features/activate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'second', directory: '/second' }),
    });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBeDefined();
    expect(body.activeFeature).toBe('first');
  });

  it('DELETE /active deactivates feature', async () => {
    // Activate first
    await fetch(url('/api/features/activate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-feat', directory: '/test' }),
    });

    const res = await fetch(url('/api/features/active'), { method: 'DELETE' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deactivated).toBe('test-feat');
  });

  it('GET /active returns feature after activation', async () => {
    await fetch(url('/api/features/activate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'active-feat', directory: '/active' }),
    });

    const res = await fetch(url('/api/features/active'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.feature).toBeDefined();
    expect(body.feature.name).toBe('active-feat');
  });

  it('DELETE /active returns 404 when no feature active', async () => {
    const res = await fetch(url('/api/features/active'), { method: 'DELETE' });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBeDefined();
  });
});
