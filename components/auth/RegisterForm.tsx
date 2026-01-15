import React, { useState } from 'react';
import { useI18n } from '../../hooks/useI18n';

interface RegisterFormProps {
    onSubmit: (email: string, password: string) => Promise<void>;
    onSwitchToLogin: () => void;
    isLoading: boolean;
    error: string | null;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit, onSwitchToLogin, isLoading, error }) => {
    const { t } = useI18n();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (password !== confirmPassword) {
            setLocalError(t('profile_account_passwords_mismatch') || 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setLocalError(t('profile_account_password_too_short') || 'Password must be at least 6 characters');
            return;
        }

        await onSubmit(email, password);
    };

    const displayError = localError || error;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-text-secondary mb-1">
                    {t('profile_account_email') || 'Email'}
                </label>
                <input
                    id="register-email"
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
                <label htmlFor="register-password" className="block text-sm font-medium text-text-secondary mb-1">
                    {t('profile_account_password') || 'Password'}
                </label>
                <input
                    id="register-password"
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

            <div>
                <label htmlFor="register-confirm" className="block text-sm font-medium text-text-secondary mb-1">
                    {t('profile_account_confirm_password') || 'Confirm Password'}
                </label>
                <input
                    id="register-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    minLength={6}
                />
            </div>

            {displayError && (
                <p className="text-red-400 text-sm">{displayError}</p>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-sky-600 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
                {isLoading ? (t('common_loading') || 'Loading...') : (t('profile_account_create_account') || 'Create Account')}
            </button>

            <p className="text-center text-text-secondary text-sm">
                {t('profile_account_have_account') || 'Already have an account?'}{' '}
                <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-primary hover:underline font-medium"
                >
                    {t('profile_account_signin') || 'Sign In'}
                </button>
            </p>
        </form>
    );
};

export default RegisterForm;
