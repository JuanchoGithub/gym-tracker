import React, { useState } from 'react';
import { useI18n } from '../../hooks/useI18n';

interface LoginFormProps {
    onSubmit: (email: string, password: string) => Promise<void>;
    onSwitchToRegister: () => void;
    isLoading: boolean;
    error: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, onSwitchToRegister, isLoading, error }) => {
    const { t } = useI18n();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(email, password);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-text-secondary mb-1">
                    {t('profile_account_email')}
                </label>
                <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                />
            </div>

            <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-text-secondary mb-1">
                    {t('profile_account_password')}
                </label>
                <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    minLength={6}
                />
            </div>

            {error && (
                <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-sky-600 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
                {isLoading ? t('common_loading') : t('profile_account_signin')}
            </button>

            <p className="text-center text-text-secondary text-sm">
                {t('profile_account_no_account')}{' '}
                <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="text-primary hover:underline font-medium"
                >
                    {t('profile_account_create')}
                </button>
            </p>
        </form>
    );
};

export default LoginForm;
