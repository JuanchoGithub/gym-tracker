import { createClient, Client } from '@libsql/client';

let db: Client | null = null;

// Lazy-initialize the Turso client
export function getDb(): Client {
    if (!db) {
        if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
            throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables');
        }
        db = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
    }
    return db;
}

export default { getDb };
