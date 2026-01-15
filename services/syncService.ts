
const API_BASE = '';

interface SyncResponse {
    success?: boolean;
    data?: Record<string, any>;
    savedKeys?: string[];
    syncedAt?: number;
    lastUpdated?: number;
    isEmpty?: boolean;
    error?: string;
}

export async function pushData(token: string, data: Record<string, any>): Promise<SyncResponse> {
    try {
        const res = await fetch(`${API_BASE}/api/sync/push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ data }),
        });
        return await res.json();
    } catch (error) {
        return { error: 'Network error. Please try again.' };
    }
}

export async function pullData(token: string): Promise<SyncResponse> {
    try {
        const res = await fetch(`${API_BASE}/api/sync/pull`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return await res.json();
    } catch (error) {
        return { error: 'Network error. Please try again.' };
    }
}

// Sync time management
const LAST_SYNC_KEY = 'last_sync_time';

export function getLastSyncTime(): number | null {
    const val = localStorage.getItem(LAST_SYNC_KEY);
    return val ? parseInt(val, 10) : null;
}

export function setLastSyncTime(time: number): void {
    localStorage.setItem(LAST_SYNC_KEY, String(time));
}

export function clearLastSyncTime(): void {
    localStorage.removeItem(LAST_SYNC_KEY);
}
