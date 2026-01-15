import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getDb } from '../db';
import { createToken, generateUserId } from '../jwt';

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
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const db = getDb();
        const existing = await db.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [email.toLowerCase().trim()]
        });

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        // Hash password and create user
        const passwordHash = await bcrypt.hash(password, 12);
        const userId = generateUserId();
        const now = Date.now();

        await db.execute({
            sql: 'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
            args: [userId, email.toLowerCase().trim(), passwordHash, now]
        });

        // Generate token
        const token = await createToken(userId, email.toLowerCase().trim());

        return res.status(201).json({
            success: true,
            user: {
                id: userId,
                email: email.toLowerCase().trim()
            },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            error: 'Failed to create account',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
