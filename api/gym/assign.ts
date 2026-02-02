import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../db.js';
import { verifyToken } from '../jwt.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid token' });

    const db = getDb();

    try {
        const { userId, routineId } = req.body;
        if (!userId || !routineId) {
            return res.status(400).json({ error: 'User ID and Routine ID are required' });
        }

        // Verify gym ownership
        const gymResult = await db.execute({
            sql: 'SELECT id FROM gyms WHERE owner_id = ?',
            args: [payload.userId]
        });

        if (gymResult.rows.length === 0) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Check if user is member of this gym
        const gymId = gymResult.rows[0].id;
        const membership = await db.execute({
            sql: 'SELECT 1 FROM gym_members WHERE gym_id = ? AND user_id = ?',
            args: [gymId, userId]
        });

        if (membership.rows.length === 0) {
            return res.status(403).json({ error: 'User is not a member of your gym' });
        }

        // Assign routine
        await db.execute({
            sql: 'INSERT OR IGNORE INTO user_gym_routines (user_id, gym_routine_id, assigned_at) VALUES (?, ?, ?)',
            args: [userId, routineId, Date.now()]
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to assign routine' });
    }
}
