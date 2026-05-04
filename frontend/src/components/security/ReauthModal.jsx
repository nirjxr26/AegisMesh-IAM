import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, ShieldAlert, XCircle } from 'lucide-react';

function getErrorMessage(error) {
    return error?.response?.data?.message
        || error?.response?.data?.error?.message
        || 'Verification failed. Please try again.';
}

export default function ReauthModal({ isOpen, onClose, onSuccess, action, requiresMfa, actionLabel }) {
    const [password, setPassword] = useState('');
    const [mfaToken, setMfaToken] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const passwordInputRef = useRef(null);
    const mfaInputRef = useRef(null);

    const handleClose = () => {
        setPassword('');
        setMfaToken('');
        setShowPassword(false);
        setError('');
        setIsSubmitting(false);
        onClose?.();
    };

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const focusTimer = window.setTimeout(() => {
            if (requiresMfa) {
                mfaInputRef.current?.focus();
                return;
            }

            passwordInputRef.current?.focus();
        }, 40);

        return () => window.clearTimeout(focusTimer);
    }, [isOpen, requiresMfa, action]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        const trimmedMfaToken = mfaToken.trim();
        const trimmedPassword = password;

        if (!trimmedMfaToken && !trimmedPassword) {
            setError('Enter your password or authenticator code to continue.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const credentials = {};

            if (trimmedMfaToken) {
                credentials.mfaToken = trimmedMfaToken;
            }

            if (trimmedPassword) {
                credentials.password = trimmedPassword;
            }

            await onSuccess?.(credentials);
        } catch (submitError) {
            setError(getErrorMessage(submitError));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:items-center sm:p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !isSubmitting) {
                    handleClose();
                }
            }}
        >
            <div className="mx-4 w-full max-w-sm rounded-t-[20px] bg-white p-6 shadow-2xl sm:mx-0 sm:rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
                <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert size={26} />
                </div>

                <h3 className="text-xl font-bold text-slate-900 text-center">Verify your identity</h3>
                <p className="text-sm text-slate-500 text-center mt-1">
                    For your security, please confirm your identity before {actionLabel || 'continuing'}.
                </p>

                <div className="mt-6 space-y-4">
                    {requiresMfa ? (
                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-2">Authenticator code</label>
                            <input
                                ref={mfaInputRef}
                                value={mfaToken}
                                onChange={(event) => {
                                    setMfaToken(event.target.value.replace(/\D/g, '').slice(0, 6));
                                    if (error) setError('');
                                }}
                                inputMode="numeric"
                                maxLength={6}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-center text-lg tracking-[0.35em] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                placeholder="000000"
                            />
                        </div>
                    ) : null}

                    {requiresMfa ? (
                        <div className="flex items-center gap-3 text-slate-300 text-xs uppercase tracking-[0.18em]">
                            <span className="flex-1 h-px bg-slate-200" />
                            <span>or</span>
                            <span className="flex-1 h-px bg-slate-200" />
                        </div>
                    ) : null}

                    {requiresMfa ? <p className="text-xs text-slate-400 text-center -mt-1">Or use your password instead</p> : null}

                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">Current password</label>
                        <div className="relative">
                            <input
                                ref={passwordInputRef}
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                    if (error) setError('');
                                }}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                placeholder="Enter your password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((current) => !current)}
                                className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 flex items-start gap-2">
                            <XCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    ) : null}

                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-full mb-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Verifying...
                                </>
                            ) : 'Verify & Continue'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}