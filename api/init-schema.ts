import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db';

// One-time schema initialization endpoint
// Visit /api/init-schema?secret=YOUR_SECRET to initialize tables
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Simple protection - require a secret query param
  const secret = req.query.secret;
  if (secret !== process.env.TURSO_AUTH_TOKEN?.slice(0, 16)) {
    return res.status(403).json({ error: 'Forbidden' });
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

    // Create user_data table for storing sync data
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

    // Create index for faster lookups
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id)
    `);

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
