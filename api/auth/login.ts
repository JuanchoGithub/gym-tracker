import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getDb } from '../db';
import { createToken } from '../jwt';

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

        // Find user
        const db = getDb();
        const result = await db.execute({
            sql: 'SELECT id, email, password_hash FROM users WHERE email = ?',
            args: [email.toLowerCase().trim()]
        });

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash as string);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = await createToken(user.id as string, user.email as string);

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                email: user.email
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            error: 'Failed to login',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
