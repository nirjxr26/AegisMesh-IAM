import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import AuthLayout from '../components/AuthLayout';
import InputField from '../components/InputField';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

const registerSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: z.string().email('Please enter a valid email'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain an uppercase letter')
        .regex(/[a-z]/, 'Must contain a lowercase letter')
        .regex(/[0-9]/, 'Must contain a number')
        .regex(/[@$!%*?&]/, 'Must contain a special character (@$!%*?&)'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export default function Register() {
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(registerSchema),
    });

    const password = useWatch({ control, name: 'password', defaultValue: '' });

    const onSubmit = async (data) => {
        setError('');
        setLoading(true);
        try {
            await authAPI.register({
                email: data.email,
                password: data.password,
                firstName: data.firstName,
                lastName: data.lastName,
            });
            setSuccess(true);
        } catch (err) {
            const errorData = err.response?.data?.error;
            setError(errorData?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <AuthLayout title="Check Your Email" subtitle="We've sent you a verification link">
                <div className="text-center space-y-4 animate-fade-in-up">
                    <div className="w-16 h-16 mx-auto bg-aws-orange/10 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-aws-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                    </div>
                    <p className="text-sm text-aws-text-dim">
                        Please check your email inbox and click the verification link to activate your account.
                    </p>
                    <Link
                        to="/login"
                        className="block w-full bg-aws-orange hover:bg-aws-orange-dark text-black font-semibold py-3 rounded-lg transition-all duration-200 btn-glow text-center"
                    >
                        Go to Login
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Create Account" subtitle="Join AegisMesh to get started">
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InputField
                        label="First Name"
                        placeholder="John"
                        error={errors.firstName?.message}
                        {...register('firstName')}
                    />
                    <InputField
                        label="Last Name"
                        placeholder="Doe"
                        error={errors.lastName?.message}
                        {...register('lastName')}
                    />
                </div>

                <InputField
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    error={errors.email?.message}
                    {...register('email')}
                />

                <InputField
                    label="Password"
                    type="password"
                    placeholder="Min. 8 characters"
                    error={errors.password?.message}
                    {...register('password')}
                />

                <PasswordStrengthMeter password={password} />

                <InputField
                    label="Confirm Password"
                    type="password"
                    placeholder="Repeat your password"
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-aws-orange hover:bg-aws-orange-dark text-black font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed btn-glow flex items-center justify-center gap-2 mt-2"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                            Creating account...
                        </>
                    ) : (
                        'Create Account'
                    )}
                </button>
            </form>

            <p className="text-center text-sm text-aws-text-dim mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-aws-orange hover:text-aws-orange-light font-medium transition-colors">
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    );
}


