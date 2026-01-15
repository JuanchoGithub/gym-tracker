import { createClient } from '@libsql/client';

// Create a singleton Turso client
const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

export default db;
