import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../db.js';
import { verifyToken } from '../jwt.js';

// Valid data keys that can be synced
const VALID_KEYS = ['history', 'routines', 'exercises', 'profile', 'settings'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verify authentication
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.slice(7);
        const payload = await verifyToken(token);

        if (!payload) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const { data } = req.body;

        if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: 'Data object is required' });
        }

        const db = getDb();
        const now = Date.now();
        const results: Record<string, number> = {};

        // 1. Handle row-level tables (history, routines, exercises)
        const rowTables: Record<string, string> = {
            history: 'sync_history',
            routines: 'sync_routines',
            exercises: 'sync_exercises'
        };

        for (const [key, tableName] of Object.entries(rowTables)) {
            const items = data[key];
            if (Array.isArray(items)) {
                let count = 0;
                for (const item of items) {
                    if (!item.id || !item.updatedAt) continue;

                    await db.execute({
                        sql: `INSERT INTO ${tableName} (id, user_id, data_json, updated_at, deleted_at)
                              VALUES (?, ?, ?, ?, ?)
                              ON CONFLICT(id) DO UPDATE SET
                                data_json = excluded.data_json,
                                updated_at = excluded.updated_at,
                                deleted_at = excluded.deleted_at
                              WHERE excluded.updated_at > ${tableName}.updated_at`,
                        args: [
                            item.id,
                            payload.userId,
                            JSON.stringify(item),
                            item.updatedAt,
                            item.deletedAt || null
                        ]
                    });
                    count++;
                }
                results[key] = count;
            }
        }

        // 2. Handle blob-level data (profile, settings - kept in user_data for backward compat)
        const blobKeys = ['profile', 'settings'];
        for (const key of blobKeys) {
            if (data[key] !== undefined) {
                await db.execute({
                    sql: `INSERT INTO user_data (user_id, data_key, data_value, updated_at) 
                        VALUES (?, ?, ?, ?)
                        ON CONFLICT(user_id, data_key) 
                        DO UPDATE SET data_value = excluded.data_value, updated_at = excluded.updated_at`,
                    args: [payload.userId, key, JSON.stringify(data[key]), now]
                });
                results[key] = 1;
            }
        }

        return res.status(200).json({
            success: true,
            results,
            syncedAt: now
        });
    } catch (error) {
        console.error('Push sync error:', error);
        return res.status(500).json({
            error: 'Failed to push data',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
