
const API_BASE = '';
const TOKEN_KEY = 'gym_admin_auth_token';

interface AuthResponse {
    success?: boolean;
    user?: {
        id: string;
        email: string;
    };
    token?: string;
    error?: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        return await res.json();
    } catch (error) {
        return { error: 'Network error. Please try again.' };
    }
}

export async function getMe(token: string): Promise<AuthResponse> {
    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return await res.json();
    } catch (error) {
        return { error: 'Network error. Please try again.' };
    }
}

export function saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}
