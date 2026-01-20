import React, { useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';

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
    const [showPassword, setShowPassword] = useState(false);

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
                <div className="relative">
                    <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg pl-4 pr-12 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                        minLength={6}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                        aria-label={showPassword ? t('profile_account_hide_password') : t('profile_account_show_password')}
                    >
                        <Icon name={showPassword ? "eye-off" : "eye"} className="w-5 h-5" />
                    </button>
                </div>
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
        </form >
    );
};

export default LoginForm;
