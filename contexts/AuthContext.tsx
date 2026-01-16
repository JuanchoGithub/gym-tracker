
import React, { createContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { login as apiLogin, register as apiRegister, getMe, getToken, saveToken, clearToken } from '../services/authService';

export interface User {
    id: string;
    email: string;
}

export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    token: string | null;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing token on mount
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

    const register = useCallback(async (email: string, password: string) => {
        const result = await apiRegister(email, password);
        if (result.success && result.user && result.token) {
            setUser(result.user);
            setToken(result.token);
            saveToken(result.token);
            return { success: true };
        }
        return { success: false, error: result.error || 'Registration failed' };
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
        register,
        logout,
        token,
    }), [user, isLoading, login, register, logout, token]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
