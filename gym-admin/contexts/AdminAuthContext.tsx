
import React, { createContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { login as apiLogin, getMe, getToken, saveToken, clearToken } from '../services/authService';

export interface User {
    id: string;
    email: string;
}

export interface AdminAuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    token: string | null;
}

export const AdminAuthContext = createContext<AdminAuthContextType>({} as AdminAuthContextType);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const storedToken = getToken();
            if (storedToken) {
                const result = await getMe(storedToken);
                if (result.user) {
                    setUser(result.user);
                    setToken(storedToken);
                } else {
                    clearToken();
                }
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const result = await apiLogin(email, password);
        if (result.success && result.user && result.token) {
            setUser(result.user);
            setToken(result.token);
            saveToken(result.token);
            return { success: true };
        }
        return { success: false, error: result.error || 'Login failed' };
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        clearToken();
    }, []);

    const value = useMemo(() => ({
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        token,
    }), [user, isLoading, login, logout, token]);

    return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};
