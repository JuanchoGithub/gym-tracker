import React, { useState, useContext } from 'react';
import Modal from '../common/Modal';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { AuthContext } from '../../contexts/AuthContext';
import { useI18n } from '../../hooks/useI18n';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const { t } = useI18n();
    const { login, register } = useContext(AuthContext);
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        const result = await login(email, password);
        setIsLoading(false);

        if (result.success) {
            onClose();
            onLoginSuccess?.();
        } else {
            setError(result.error || t('auth_login_failed'));
        }
    };

    const handleRegister = async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        const result = await register(email, password);
        setIsLoading(false);

        if (result.success) {
            onClose();
            onLoginSuccess?.();
        } else {
            setError(result.error || t('auth_register_failed'));
        }
    };

    const handleModeSwitch = (newMode: 'login' | 'register') => {
        setMode(newMode);
        setError(null);
    };

    const title = mode === 'login'
        ? (t('profile_account_signin') || 'Sign In')
        : (t('profile_account_create_account') || 'Create Account');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            {mode === 'login' ? (
                <LoginForm
                    onSubmit={handleLogin}
                    onSwitchToRegister={() => handleModeSwitch('register')}
                    isLoading={isLoading}
                    error={error}
                />
            ) : (
                <RegisterForm
                    onSubmit={handleRegister}
                    onSwitchToLogin={() => handleModeSwitch('login')}
                    isLoading={isLoading}
                    error={error}
                />
            )}
        </Modal>
    );
};

export default AuthModal;
