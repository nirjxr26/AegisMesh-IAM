import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import AuthLayout from '../components/AuthLayout';
import InputField from '../components/InputField';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

const resetSchema = z.object({
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain an uppercase letter')
        .regex(/[a-z]/, 'Must contain a lowercase letter')
        .regex(/[0-9]/, 'Must contain a number')
        .regex(/[@$!%*?&]/, 'Must contain a special character (@$!%*?&)'),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(resetSchema),
    });

    const password = useWatch({ control, name: 'newPassword', defaultValue: '' });

    if (!token) {
        return (
            <AuthLayout title="Invalid Link" subtitle="This password reset link is invalid">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-aws-red/10 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-aws-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <Link
                        to="/forgot-password"
                        className="block w-full bg-aws-orange hover:bg-aws-orange-dark text-black font-semibold py-3 rounded-lg transition-all btn-glow text-center"
                    >
                        Request New Reset Link
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    const onSubmit = async (data) => {
        setError('');
        setLoading(true);
        try {
            await authAPI.resetPassword({ token, newPassword: data.newPassword });
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <AuthLayout title="Password Reset!" subtitle="Your password has been successfully changed">
                <div className="text-center space-y-4 animate-fade-in-up">
                    <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-sm text-aws-text-dim">
                        All your active sessions have been invalidated for security.
                    </p>
                    <Link
                        to="/login"
                        className="block w-full bg-aws-orange hover:bg-aws-orange-dark text-black font-semibold py-3 rounded-lg transition-all btn-glow text-center"
                    >
                        Sign In with New Password
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Set New Password" subtitle="Choose a strong, unique password">
            {error && (
                <div className="mb-6 p-3 rounded-lg bg-aws-red/10 border border-aws-red/20">
                    <p className="text-sm text-aws-red">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <InputField
                    label="New Password"
                    type="password"
                    placeholder="Min. 8 characters"
                    error={errors.newPassword?.message}
                    {...register('newPassword')}
                />

                <PasswordStrengthMeter password={password} />

                <InputField
                    label="Confirm New Password"
                    type="password"
                    placeholder="Repeat your password"
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-aws-orange hover:bg-aws-orange-dark text-black font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 btn-glow flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                            Resetting...
                        </>
                    ) : (
                        'Reset Password'
                    )}
                </button>
            </form>
        </AuthLayout>
    );
}


