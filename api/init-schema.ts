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
        role TEXT DEFAULT 'user',
        created_at INTEGER NOT NULL
      )
    `);

    // Create gyms table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS gyms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create gym_members table (many-to-many relationship between users and gyms)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS gym_members (
        gym_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at INTEGER NOT NULL,
        PRIMARY KEY (gym_id, user_id),
        FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create gym_routines table for shared routines within a gym
    await db.execute(`
      CREATE TABLE IF NOT EXISTS gym_routines (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        name TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
      )
    `);

    // Create user_gym_routines table for assigning gym routines to specific users
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_gym_routines (
        user_id TEXT NOT NULL,
        gym_routine_id TEXT NOT NULL,
        assigned_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, gym_routine_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (gym_routine_id) REFERENCES gym_routines(id) ON DELETE CASCADE
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
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_gym_owner ON gyms(owner_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_gym_members_user ON gym_members(user_id)`);

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
