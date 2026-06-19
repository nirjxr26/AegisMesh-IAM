import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import MFASetupWizard from '../../components/MFASetupWizard';

export default function MFASettings() {
    const { user, loadProfile } = useAuth();
    const navigate = useNavigate();
    const [showDisableForm, setShowDisableForm] = useState(false);
    const [disablePassword, setDisablePassword] = useState('');
    const [disableTotp, setDisableTotp] = useState('');
    const [disableError, setDisableError] = useState('');
    const [disableLoading, setDisableLoading] = useState(false);

    const handleMFAComplete = async () => {
        await loadProfile();
        navigate('/dashboard');
    };

    const handleDisableMFA = async (e) => {
        e.preventDefault();
        setDisableError('');
        setDisableLoading(true);
        try {
            await authAPI.disableMFA({ password: disablePassword, totpCode: disableTotp });
            await loadProfile();
            navigate('/dashboard');
        } catch (err) {
            setDisableError(err.response?.data?.error?.message || 'Failed to disable MFA');
        } finally {
            setDisableLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-aws-dark">
            {/* Header */}
            <header className="border-b border-aws-border bg-aws-darker/80 backdrop-blur-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-16 gap-4">
                        <Link to="/dashboard" className="text-aws-text-dim hover:text-[#0f1623] transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-[#0f1623]">MFA Settings</h1>
                            <p className="text-xs text-aws-text-dim">Two-Factor Authentication</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-xl mx-auto px-4 py-8">
                {user?.mfaEnabled ? (
                    // MFA is enabled - show status and disable option
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="glass rounded-2xl p-8 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-2xl flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-[#0f1623]">MFA is Enabled</h2>
                            <p className="text-sm text-aws-text-dim">
                                Your account is protected with two-factor authentication.
                            </p>
                        </div>

                        {!showDisableForm ? (
                            <button
                                onClick={() => setShowDisableForm(true)}
                                className="w-full text-sm font-medium text-aws-red hover:text-red-400 bg-aws-red/5 hover:bg-aws-red/10 px-4 py-3 rounded-xl border border-aws-red/20 hover:border-aws-red/40 transition-all"
                            >
                                Disable Two-Factor Authentication
                            </button>
                        ) : (
                            <div className="glass rounded-2xl p-6 animate-fade-in-up">
                                <h3 className="font-semibold text-[#0f1623] mb-4">Confirm Disable MFA</h3>
                                {disableError && (
                                    <div className="mb-4 p-3 rounded-lg bg-aws-red/10 border border-aws-red/20">
                                        <p className="text-sm text-aws-red">{disableError}</p>
                                    </div>
                                )}
                                <form onSubmit={handleDisableMFA} className="space-y-4">
                                    <div>
                                        <label htmlFor="disable-password" className="block text-sm text-aws-text-dim mb-1">Password</label>
                                        <input
                                            id="disable-password"
                                            type="password"
                                            value={disablePassword}
                                            onChange={(e) => setDisablePassword(e.target.value)}
                                            className="w-full bg-aws-input border border-aws-input-border rounded-lg px-4 py-3 text-[#0f1623] text-sm focus:outline-none focus:ring-2 focus:ring-aws-red/30 focus:border-aws-red"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="disable-totp" className="block text-sm text-aws-text-dim mb-1">TOTP Code</label>
                                        <input
                                            id="disable-totp"
                                            type="text"
                                            maxLength={6}
                                            value={disableTotp}
                                            onChange={(e) => setDisableTotp(e.target.value.replace(/\D/g, ''))}
                                            placeholder="000000"
                                            className="w-full bg-aws-input border border-aws-input-border rounded-lg px-4 py-3 text-[#0f1623] text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-aws-red/30 focus:border-aws-red"
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowDisableForm(false)}
                                            className="flex-1 py-2.5 rounded-lg text-sm text-aws-text-dim hover:text-[#0f1623] bg-aws-navy-light border border-aws-border transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={disableLoading}
                                            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-aws-red text-white hover:bg-red-600 transition-all disabled:opacity-50"
                                        >
                                            {disableLoading ? 'Disabling...' : 'Disable MFA'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                ) : (
                    // MFA not enabled - show setup wizard
                    <div className="glass rounded-2xl p-8 animate-fade-in-up">
                        <MFASetupWizard
                            onComplete={handleMFAComplete}
                            onClose={() => navigate('/dashboard')}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}


