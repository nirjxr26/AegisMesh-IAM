import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import AuthLayout from '../components/AuthLayout';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState(() => (token ? 'verifying' : 'error')); // verifying, success, error
    const [error, setError] = useState(() => (token ? '' : 'No verification token provided'));

    useEffect(() => {
        if (!token) {
            return;
        }

        const verify = async () => {
            try {
                await authAPI.verifyEmail(token);
                setStatus('success');
            } catch (err) {
                setStatus('error');
                setError(err.response?.data?.error?.message || 'Verification failed');
            }
        };

        verify();
    }, [token]);

    return (
        <AuthLayout>
            <div className="text-center space-y-4 animate-fade-in-up">
                {status === 'verifying' && (
                    <>
                        <div className="w-16 h-16 mx-auto flex items-center justify-center">
                            <div className="w-12 h-12 border-3 border-aws-orange border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-lg font-bold text-[#0f1623]">Verifying Your Email...</h3>
                        <p className="text-sm text-aws-text-dim">Please wait while we verify your email address.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-2xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-[#0f1623]">Email Verified!</h3>
                        <p className="text-sm text-aws-text-dim">Your email has been verified successfully. You can now sign in.</p>
                        <Link
                            to="/login"
                            className="block w-full bg-aws-orange hover:bg-aws-orange-dark text-black font-semibold py-3 rounded-lg transition-all btn-glow text-center"
                        >
                            Sign In
                        </Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 mx-auto bg-aws-red/10 rounded-2xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-aws-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374H4.653c-1.73 0-2.813-1.874-1.948-3.374L10.051 3.378c.866-1.5 3.032-1.5 3.898 0L21.303 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-[#0f1623]">Verification Failed</h3>
                        <p className="text-sm text-aws-red">{error}</p>
                        <Link
                            to="/login"
                            className="block w-full bg-aws-navy-light hover:bg-aws-navy text-aws-text font-medium py-3 rounded-lg border border-aws-border transition-all text-center text-sm"
                        >
                            Go to Login
                        </Link>
                    </>
                )}
            </div>
        </AuthLayout>
    );
}


