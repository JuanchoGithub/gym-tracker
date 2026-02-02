import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../db.js';
import { verifyToken } from '../jwt.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid token' });

    const db = getDb();

    if (req.method === 'GET') {
        try {
            // Get gym where this user is owner
            const gymResult = await db.execute({
                sql: 'SELECT * FROM gyms WHERE owner_id = ?',
                args: [payload.userId]
            });

            if (gymResult.rows.length === 0) {
                return res.status(200).json({ gym: null });
            }

            const gym = gymResult.rows[0];

            // Get user count
            const usersResult = await db.execute({
                sql: 'SELECT COUNT(*) as count FROM gym_members WHERE gym_id = ?',
                args: [gym.id]
            });

            // Get routine count
            const routinesResult = await db.execute({
                sql: 'SELECT COUNT(*) as count FROM gym_routines WHERE gym_id = ?',
                args: [gym.id]
            });

            return res.status(200).json({
                gym: {
                    ...gym,
                    userCount: usersResult.rows[0].count,
                    routineCount: routinesResult.rows[0].count
                }
            });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch gym info' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).json({ error: 'Gym name is required' });

            // Check if already has a gym
            const existing = await db.execute({
                sql: 'SELECT id FROM gyms WHERE owner_id = ?',
                args: [payload.userId]
            });

            if (existing.rows.length > 0) {
                // Update
                await db.execute({
                    sql: 'UPDATE gyms SET name = ? WHERE owner_id = ?',
                    args: [name, payload.userId]
                });
                return res.status(200).json({ success: true, message: 'Gym updated' });
            } else {
                // Create
                const gymId = 'gym_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
                await db.execute({
                    sql: 'INSERT INTO gyms (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)',
                    args: [gymId, name, payload.userId, Date.now()]
                });

                // Set user role as gym_owner
                await db.execute({
                    sql: 'UPDATE users SET role = ? WHERE id = ?',
                    args: ['gym_owner', payload.userId]
                });

                return res.status(201).json({ success: true, gymId });
            }
        } catch (error) {
            return res.status(500).json({ error: 'Failed to save gym info' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
