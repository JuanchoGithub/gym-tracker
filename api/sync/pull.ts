import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../db.js';
import { verifyToken } from '../jwt.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
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

        // Fetch all user data
        const db = getDb();
        const result = await db.execute({
            sql: 'SELECT data_key, data_value, updated_at FROM user_data WHERE user_id = ?',
            args: [payload.userId]
        });

        const data: Record<string, any> = {};
        let lastUpdated = 0;

        for (const row of result.rows) {
            const key = row.data_key as string;
            const value = row.data_value as string;
            const updatedAt = row.updated_at as number;

            try {
                data[key] = JSON.parse(value);
            } catch {
                data[key] = value;
            }

            if (updatedAt > lastUpdated) {
                lastUpdated = updatedAt;
            }
        }

        return res.status(200).json({
            success: true,
            data,
            lastUpdated,
            isEmpty: result.rows.length === 0
        });
    } catch (error) {
        console.error('Pull sync error:', error);
        return res.status(500).json({
            error: 'Failed to pull data',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
