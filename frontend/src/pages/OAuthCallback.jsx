import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { loadProfile } = useAuth();
    const [runtimeErrorMessage, setRuntimeErrorMessage] = useState('');

    const error = searchParams.get('error');
    const errorMessage = error
        ? 'OAuth sign-in failed. Please try again.'
        : runtimeErrorMessage;

    useEffect(() => {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');

        if (error) {
            return;
        }

        if (accessToken) {
            localStorage.setItem('accessToken', accessToken);
        }
        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
        }

        const finalizeOAuth = async () => {
            try {
                await loadProfile();
                navigate('/dashboard', { replace: true });
            } catch {
                setRuntimeErrorMessage('Unable to complete OAuth sign-in. Please retry from login.');
            }
        };

        finalizeOAuth();
    }, [error, loadProfile, navigate, searchParams]);

    if (errorMessage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-aws-dark">
                <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#0f172a] p-6 text-center shadow-xl">
                    <h1 className="text-lg font-semibold text-white">OAuth Sign-In Error</h1>
                    <p className="mt-2 text-sm text-aws-text-dim">{errorMessage}</p>
                    <button
                        onClick={() => navigate('/login', { replace: true })}
                        className="mt-4 rounded-xl bg-aws-orange px-4 py-2 text-sm font-medium text-black hover:opacity-90"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-aws-dark">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-3 border-aws-orange border-t-transparent rounded-full animate-spin"></div>
                <p className="text-aws-text-dim text-sm">Completing sign in...</p>
            </div>
        </div>
    );
}


