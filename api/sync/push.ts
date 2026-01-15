import type { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../db';
import { verifyToken } from '../jwt';

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

        const now = Date.now();
        const savedKeys: string[] = [];

        // Save each data key
        for (const key of VALID_KEYS) {
            if (data[key] !== undefined) {
                const value = JSON.stringify(data[key]);

                await db.execute({
                    sql: `INSERT INTO user_data (user_id, data_key, data_value, updated_at) 
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, data_key) 
                DO UPDATE SET data_value = excluded.data_value, updated_at = excluded.updated_at`,
                    args: [payload.userId, key, value, now]
                });

                savedKeys.push(key);
            }
        }

        return res.status(200).json({
            success: true,
            savedKeys,
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
