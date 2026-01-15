import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../jwt';

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
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.slice(7);
        const payload = await verifyToken(token);

        if (!payload) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        return res.status(200).json({
            user: {
                id: payload.userId,
                email: payload.email
            }
        });
    } catch (error) {
        console.error('Auth check error:', error);
        return res.status(500).json({
            error: 'Failed to verify authentication',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
