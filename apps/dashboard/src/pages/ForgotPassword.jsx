import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import AuthLayout from '../components/AuthLayout';
import InputField from '../components/InputField';

const forgotSchema = z.object({
    email: z.string().email('Please enter a valid email'),
});

export default function ForgotPassword() {
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(forgotSchema),
    });

    const onSubmit = async (data) => {
        setError('');
        setLoading(true);
        try {
            await authAPI.forgotPassword(data);
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <AuthLayout title="Check Your Email" subtitle="Password reset instructions sent">
                <div className="text-center space-y-4 animate-fade-in-up">
                    <div className="w-16 h-16 mx-auto bg-aws-orange/10 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-aws-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                    </div>
                    <p className="text-sm text-aws-text-dim">
                        If an account exists with that email, we've sent you password reset instructions.
                    </p>
                    <Link
                        to="/login"
                        className="block w-full bg-aws-navy-light hover:bg-aws-navy text-aws-text font-medium py-3 rounded-lg border border-aws-border hover:border-aws-orange/30 transition-all duration-200 text-center text-sm"
                    >
                        Back to Login
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Reset Password" subtitle="Enter your email to receive a reset link">
            {error && (
                <div className="mb-6 p-3 rounded-lg bg-aws-red/10 border border-aws-red/20">
                    <p className="text-sm text-aws-red">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    error={errors.email?.message}
                    {...register('email')}
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-aws-orange hover:bg-aws-orange-dark text-black font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 btn-glow flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                            Sending...
                        </>
                    ) : (
                        'Send Reset Link'
                    )}
                </button>
            </form>

            <p className="text-center text-sm text-aws-text-dim mt-6">
                Remember your password?{' '}
                <Link to="/login" className="text-aws-orange hover:text-aws-orange-light font-medium transition-colors">
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    );
}


