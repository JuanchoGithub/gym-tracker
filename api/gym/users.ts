import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { verifyToken, generateUserId } from '../jwt.js';

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

    // Verify requester is a gym owner and get their gymId
    const gymResult = await db.execute({
        sql: 'SELECT id FROM gyms WHERE owner_id = ?',
        args: [payload.userId]
    });

    if (gymResult.rows.length === 0) {
        return res.status(403).json({ error: 'Forbidden: You do not own a gym' });
    }

    const gymId = gymResult.rows[0].id;

    if (req.method === 'GET') {
        try {
            const users = await db.execute({
                sql: `
                    SELECT u.id, u.email, m.joined_at as joinedAt,
                    (SELECT COUNT(*) FROM user_gym_routines WHERE user_id = u.id) as routinesCount
                    FROM users u
                    JOIN gym_members m ON u.id = m.user_id
                    WHERE m.gym_id = ?
                `,
                args: [gymId]
            });

            return res.status(200).json({ users: users.rows });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

            // Check if user exists
            const existing = await db.execute({
                sql: 'SELECT id FROM users WHERE email = ?',
                args: [email.toLowerCase().trim()]
            });

            let userId: string;
            if (existing.rows.length > 0) {
                userId = existing.rows[0].id as string;
                // Check if already in this gym
                const inGym = await db.execute({
                    sql: 'SELECT 1 FROM gym_members WHERE gym_id = ? AND user_id = ?',
                    args: [gymId, userId]
                });
                if (inGym.rows.length > 0) {
                    return res.status(409).json({ error: 'User is already a member of your gym' });
                }
            } else {
                // Create new user
                userId = generateUserId();
                const passwordHash = await bcrypt.hash(password, 12);
                await db.execute({
                    sql: 'INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
                    args: [userId, email.toLowerCase().trim(), passwordHash, 'user', Date.now()]
                });
            }

            // Add to gym_members
            await db.execute({
                sql: 'INSERT INTO gym_members (gym_id, user_id, joined_at) VALUES (?, ?, ?)',
                args: [gymId, userId, Date.now()]
            });

            return res.status(201).json({ success: true, userId });
        } catch (error) {
            console.error('Add user error:', error);
            return res.status(500).json({ error: 'Failed to add user' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
