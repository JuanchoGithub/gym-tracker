import React, { useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';

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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (password !== confirmPassword) {
            setLocalError(t('profile_account_passwords_mismatch'));
            return;
        }

        if (password.length < 6) {
            setLocalError(t('profile_account_password_too_short'));
            return;
        }

        await onSubmit(email, password);
    };

    const displayError = localError || error;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-text-secondary mb-1">
                    {t('profile_account_email')}
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
                    {t('profile_account_password')}
                </label>
                <div className="relative">
                    <input
                        id="register-password"
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

            <div>
                <label htmlFor="register-confirm" className="block text-sm font-medium text-text-secondary mb-1">
                    {t('profile_account_confirm_password')}
                </label>
                <div className="relative">
                    <input
                        id="register-confirm"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg pl-4 pr-12 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                        minLength={6}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                        aria-label={showConfirmPassword ? t('profile_account_hide_password') : t('profile_account_show_password')}
                    >
                        <Icon name={showConfirmPassword ? "eye-off" : "eye"} className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {displayError && (
                <p className="text-red-400 text-sm">{displayError}</p>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-sky-600 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
                {isLoading ? t('common_loading') : t('profile_account_create_account')}
            </button>

            <p className="text-center text-text-secondary text-sm">
                {t('profile_account_have_account')}{' '}
                <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-primary hover:underline font-medium"
                >
                    {t('profile_account_signin')}
                </button>
            </p>
        </form>
    );
};

export default RegisterForm;
