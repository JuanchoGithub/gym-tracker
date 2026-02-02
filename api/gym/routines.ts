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

    // Verify gym ownership
    const gymResult = await db.execute({
        sql: 'SELECT id FROM gyms WHERE owner_id = ?',
        args: [payload.userId]
    });

    if (gymResult.rows.length === 0) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const gymId = gymResult.rows[0].id;

    if (req.method === 'GET') {
        try {
            const routines = await db.execute({
                sql: `
                    SELECT r.*, 
                    (SELECT COUNT(*) FROM user_gym_routines WHERE gym_routine_id = r.id) as usersCount
                    FROM gym_routines r
                    WHERE r.gym_id = ?
                `,
                args: [gymId]
            });

            // Parse data_json for exercises count
            const result = routines.rows.map(r => {
                let exercisesCount = 0;
                try {
                    const data = JSON.parse(r.data_json as string);
                    exercisesCount = data.exercises?.length || 0;
                } catch (e) { }
                return { ...r, exercisesCount };
            });

            return res.status(200).json({ routines: result });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch routines' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { name, exercises } = req.body;
            if (!name) return res.status(400).json({ error: 'Name required' });

            const id = 'grot_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
            const now = Date.now();

            await db.execute({
                sql: 'INSERT INTO gym_routines (id, gym_id, name, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                args: [id, gymId, name, JSON.stringify({ exercises: exercises || [] }), now, now]
            });

            return res.status(201).json({ success: true, id });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to create routine' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
