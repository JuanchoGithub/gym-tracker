import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

// One-time schema initialization endpoint
// Visit /api/init-schema?secret=YOUR_SECRET to initialize tables
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Simple protection - require a secret query param
  const secret = typeof req.query.secret === 'string' ? req.query.secret : '';
  const expectedSecret = process.env.TURSO_AUTH_TOKEN?.slice(0, 16);

  if (!expectedSecret) {
    return res.status(500).json({ error: 'Server configuration error: TURSO_AUTH_TOKEN missing' });
  }

  if (secret !== expectedSecret) {
    return res.status(403).json({ error: 'Forbidden: Secret mismatch' });
  }

  try {
    const db = getDb();

    // Create users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    // Create user_data table for storing sync data (settings, profile, etc.)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_data (
        user_id TEXT NOT NULL,
        data_key TEXT NOT NULL,
        data_value TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, data_key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create sync_history table for individual workout sessions
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sync_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        data_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create sync_routines table for user routines
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sync_routines (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        data_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create sync_exercises table for custom exercises
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sync_exercises (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        data_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_data_id ON user_data(user_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_history_updated ON sync_history(user_id, updated_at)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_routines_updated ON sync_routines(user_id, updated_at)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_exercises_updated ON sync_exercises(user_id, updated_at)`);

    return res.status(200).json({
      success: true,
      message: 'Database schema initialized successfully'
    });
  } catch (error) {
    console.error('Schema initialization error:', error);
    return res.status(500).json({
      error: 'Failed to initialize schema',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
