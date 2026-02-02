
import React, { useState } from 'react';

interface LoginFormProps {
    onSubmit: (email: string, password: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading, error }) => {
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
                <label className="block text-sm font-medium text-text-secondary mb-1">
                    Email Address
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-primary transition-colors"
                    placeholder="admin@gym.com"
                    required
                    disabled={isLoading}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                    Password
                </label>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-background border border-surface-highlight rounded-lg pl-4 pr-12 py-3 text-text-primary focus:outline-none focus:border-primary transition-colors"
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                        minLength={6}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors"
                    >
                        {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L4.22 4.22m15.56 15.56L14.122 14.12" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <p className="text-danger text-sm">{error}</p>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:opacity-90 disabled:bg-surface-highlight text-white font-bold py-3 px-4 rounded-lg transition-all"
            >
                {isLoading ? 'Signing in...' : 'Sign In to Admin'}
            </button>
        </form>
    );
};

export default LoginForm;
