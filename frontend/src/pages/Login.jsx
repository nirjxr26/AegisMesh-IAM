import { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import InputField from '../components/InputField';

export default function Login() {
    const { user, login, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [mfaRequired, setMfaRequired] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        totpCode: '',
    });
    const [formErrors, setFormErrors] = useState({});

    const from = location.state?.from?.pathname || '/dashboard';

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-aws-dark">
                <div className="flex flex-col items-center gap-3 text-aws-text-dim">
                    <div className="w-9 h-9 border-2 border-aws-orange border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (user) return <Navigate to="/dashboard" replace />;

    const handleChange = (field) => (event) => {
        const value = event.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (formErrors[field]) {
            setFormErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const validate = () => {
        const nextErrors = {};

        if (!formData.email.trim()) {
            nextErrors.email = 'Email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
            nextErrors.email = 'Please enter a valid email';
        }

        if (!formData.password) {
            nextErrors.password = 'Password is required';
        }

        if (mfaRequired && !formData.totpCode.trim()) {
            nextErrors.totpCode = 'Two-factor code is required';
        }

        setFormErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const onSubmit = async (event) => {
        event.preventDefault();
        if (!validate()) {
            return;
        }

        setError('');
        setLoading(true);
        try {
            await login({
                email: formData.email.trim(),
                password: formData.password,
                totpCode: formData.totpCode?.trim() || undefined,
            });
            navigate(from, { replace: true });
        } catch (err) {
            const errorData = err.response?.data?.error;
            if (errorData?.code === 'AUTH_004') {
                setMfaRequired(true);
                setError('');
            } else if (errorData?.code === 'AUTH_002') {
                const unlockTime = errorData.details?.unlockTime;
                setError(`Account locked. Try again ${unlockTime ? `after ${new Date(unlockTime).toLocaleTimeString()}` : 'later'}.`);
            } else {
                setError(errorData?.message || 'Login failed. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Welcome Back" subtitle="Sign in to your AegisMesh account">
            {error && (
                <div className="mb-6 p-3 rounded-lg bg-aws-red/10 border border-aws-red/20 animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
                    <p className="text-sm text-aws-red flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </p>
                </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <InputField
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange('email')}
                    error={formErrors.email}
                    autoComplete="email"
                />

                <InputField
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange('password')}
                    error={formErrors.password}
                    autoComplete="current-password"
                />

                {mfaRequired && (
                    <div className="animate-fade-in-up">
                        <InputField
                            label="Two-Factor Code"
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={formData.totpCode}
                            onChange={handleChange('totpCode')}
                            error={formErrors.totpCode}
                            maxLength={6}
                            autoComplete="one-time-code"
                        />
                        <p className="text-xs text-aws-text-dim mt-1.5">
                            Enter the code from your authenticator app or a backup code.
                        </p>
                    </div>
                )}

                <div className="flex justify-end">
                    <Link
                        to="/forgot-password"
                        className="text-xs text-aws-orange hover:text-aws-orange-light transition-colors"
                    >
                        Forgot password?
                    </Link>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-aws-orange hover:bg-aws-orange-dark text-black font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed btn-glow flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                            Signing in...
                        </>
                    ) : (
                        'Sign In'
                    )}
                </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-aws-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="bg-aws-card px-3 text-aws-text-dim">or continue with</span>
                </div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <a
                    href="/api/auth/oauth/google"
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-aws-border bg-aws-navy-light hover:bg-aws-navy hover:border-aws-orange/30 transition-all duration-200 text-sm text-aws-text"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                </a>
                <a
                    href="/api/auth/oauth/github"
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-aws-border bg-aws-navy-light hover:bg-aws-navy hover:border-aws-orange/30 transition-all duration-200 text-sm text-aws-text"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                </a>
            </div>

            <p className="text-center text-sm text-aws-text-dim mt-6">
                Don't have an account?{' '}
                <Link to="/register" className="text-aws-orange hover:text-aws-orange-light font-medium transition-colors">
                    Create one
                </Link>
            </p>
        </AuthLayout>
    );
}


