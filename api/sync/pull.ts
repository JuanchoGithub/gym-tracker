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

        // Support incremental pull
        const since = parseInt(req.query.since as string) || 0;
        const db = getDb();
        const data: Record<string, any> = {
            history: [],
            routines: [],
            exercises: []
        };
        let maxUpdatedAt = since;

        // 1. Fetch from row-level tables
        const rowTables: Record<string, string> = {
            history: 'sync_history',
            routines: 'sync_routines',
            exercises: 'sync_exercises'
        };

        for (const [key, tableName] of Object.entries(rowTables)) {
            const result = await db.execute({
                sql: `SELECT data_json, updated_at FROM ${tableName} WHERE user_id = ? AND updated_at > ?`,
                args: [payload.userId, since]
            });

            for (const row of result.rows) {
                try {
                    const item = JSON.parse(row.data_json as string);
                    data[key].push(item);
                    if ((row.updated_at as number) > maxUpdatedAt) {
                        maxUpdatedAt = row.updated_at as number;
                    }
                } catch (e) {
                    console.error(`Error parsing ${key} row:`, e);
                }
            }
        }
        // 1.5. Fetch Gym-Assigned Routines
        const gymRoutinesResult = await db.execute({
            sql: `
                SELECT gr.id, gr.name, gr.data_json, gr.updated_at 
                FROM gym_routines gr
                JOIN user_gym_routines ugr ON gr.id = ugr.gym_routine_id
                WHERE ugr.user_id = ? AND gr.updated_at > ?
            `,
            args: [payload.userId, since]
        });

        for (const row of gymRoutinesResult.rows) {
            try {
                const routine = JSON.parse(row.data_json as string);
                // Ensure it has the correct ID and name from the table
                const routineItem = {
                    ...routine,
                    id: row.id,
                    name: row.name,
                    updatedAt: row.updated_at,
                    isGymRoutine: true // Mark as gym routine so UI can distinguish
                };
                data.routines.push(routineItem);
                if ((row.updated_at as number) > maxUpdatedAt) {
                    maxUpdatedAt = row.updated_at as number;
                }
            } catch (e) {
                console.error('Error parsing gym routine:', e);
            }
        }

        // 2. Fetch from blob-level table (user_data)
        const blobResult = await db.execute({
            sql: 'SELECT data_key, data_value, updated_at FROM user_data WHERE user_id = ? AND updated_at > ?',
            args: [payload.userId, since]
        });

        for (const row of blobResult.rows) {
            try {
                const key = row.data_key as string;
                data[key] = JSON.parse(row.data_value as string);
                if ((row.updated_at as number) > maxUpdatedAt) {
                    maxUpdatedAt = row.updated_at as number;
                }
            } catch (e) {
                console.error(`Error parsing blob ${row.data_key}:`, e);
            }
        }

        return res.status(200).json({
            success: true,
            data,
            lastUpdated: maxUpdatedAt,
            isEmpty: maxUpdatedAt === since
        });
    } catch (error) {
        console.error('Pull sync error:', error);
        return res.status(500).json({
            error: 'Failed to pull data',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
