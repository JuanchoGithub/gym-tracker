import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.TURSO_AUTH_TOKEN || 'fallback-secret-for-dev'
);

export interface JWTPayload {
    userId: string;
    email: string;
    iat: number;
    exp: number;
}

export async function createToken(userId: string, email: string): Promise<string> {
    return new SignJWT({ userId, email })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as JWTPayload;
    } catch {
        return null;
    }
}

export function generateUserId(): string {
    return 'user_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}
