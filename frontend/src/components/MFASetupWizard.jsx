import PropTypes from 'prop-types';
import { useState } from 'react';
import { authAPI } from '../services/api';

export default function MFASetupWizard({ onComplete, onClose }) {
    const [step, setStep] = useState(1); // 1: Setup, 2: QR Code, 3: Verify, 4: Backup Codes
    const [qrData, setQrData] = useState(null);
    const [totpCode, setTotpCode] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSetup = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await authAPI.setupMFA();
            setQrData(data.data);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to setup MFA');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (totpCode.length !== 6) {
            setError('Code must be 6 digits');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const { data } = await authAPI.verifyMFASetup(totpCode);
            setBackupCodes(data.data.backupCodes);
            setStep(4);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyBackupCodes = () => {
        const text = backupCodes.join('\n');
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= s
                                ? 'bg-aws-orange text-black'
                                : 'bg-aws-navy-light text-aws-text-dim border border-aws-border'
                            }`}>
                            {step > s ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : s}
                        </div>
                        {s < 4 && (
                            <div className={`w-8 h-0.5 transition-colors ${step > s ? 'bg-aws-orange' : 'bg-aws-border'}`}></div>
                        )}
                    </div>
                ))}
            </div>

            {/* Step 1: Introduction */}
            {step === 1 && (
                <div className="text-center space-y-4 animate-fade-in-up">
                    <div className="w-16 h-16 mx-auto bg-aws-orange/10 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-aws-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-[#0f1623]">Enable Two-Factor Authentication</h3>
                    <p className="text-sm text-aws-text-dim leading-relaxed">
                        Add an extra layer of security to your account. You'll need an authenticator app like
                        Google Authenticator, Authy, or 1Password.
                    </p>
                    <button
                        onClick={handleSetup}
                        disabled={loading}
                        className="w-full bg-aws-orange hover:bg-aws-orange-dark text-black font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 btn-glow"
                    >
                        {loading ? 'Setting up...' : 'Begin Setup'}
                    </button>
                </div>
            )}

            {/* Step 2: QR Code */}
            {step === 2 && qrData && (
                <div className="text-center space-y-4 animate-fade-in-up">
                    <h3 className="text-lg font-bold text-[#0f1623]">Scan QR Code</h3>
                    <p className="text-sm text-aws-text-dim">
                        Open your authenticator app and scan this QR code.
                    </p>
                    <div className="bg-white p-4 rounded-xl inline-block mx-auto">
                        <img src={qrData.qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
                    </div>
                    <div className="text-left">
                        <p className="text-xs text-aws-text-dim mb-1">Can't scan? Enter this key manually:</p>
                        <div className="bg-aws-input border border-aws-border rounded-lg p-3 font-mono text-sm text-aws-orange break-all select-all">
                            {qrData.secret}
                        </div>
                    </div>
                    <button
                        onClick={() => setStep(3)}
                        className="w-full bg-aws-orange hover:bg-aws-orange-dark text-black font-semibold py-3 rounded-lg transition-all duration-200 btn-glow"
                    >
                        I've Scanned the Code
                    </button>
                </div>
            )}

            {/* Step 3: Verify */}
            {step === 3 && (
                <div className="text-center space-y-4 animate-fade-in-up">
                    <h3 className="text-lg font-bold text-[#0f1623]">Enter Verification Code</h3>
                    <p className="text-sm text-aws-text-dim">
                        Enter the 6-digit code from your authenticator app.
                    </p>
                    <div className="flex justify-center">
                        <input
                            type="text"
                            maxLength={6}
                            value={totpCode}
                            onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '');
                                setTotpCode(v);
                                setError('');
                            }}
                            placeholder="000000"
                            className="w-48 text-center text-2xl font-mono tracking-[0.3em] bg-aws-input border border-aws-border rounded-lg px-4 py-3 text-[#0f1623] placeholder:text-aws-text-dim/30 focus:outline-none focus:ring-2 focus:ring-aws-orange/30 focus:border-aws-orange"
                            autoFocus
                        />
                    </div>
                    {error && (
                        <p className="text-aws-red text-sm">{error}</p>
                    )}
                    <button
                        onClick={handleVerify}
                        disabled={loading || totpCode.length !== 6}
                        className="w-full bg-aws-orange hover:bg-aws-orange-dark text-black font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 btn-glow"
                    >
                        {loading ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                </div>
            )}

            {/* Step 4: Backup Codes */}
            {step === 4 && (
                <div className="text-center space-y-4 animate-fade-in-up">
                    <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-[#0f1623]">MFA Enabled Successfully!</h3>
                    <p className="text-sm text-aws-text-dim">
                        Save these backup codes in a secure place. Each code can only be used once.
                    </p>

                    <div className="bg-aws-input border border-aws-border rounded-xl p-4">
                        <div className="grid grid-cols-2 gap-2">
                            {backupCodes.map((code) => (
                                <div key={code} className="font-mono text-sm text-aws-orange bg-aws-navy-light rounded px-3 py-1.5">
                                    {code}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleCopyBackupCodes}
                        className="flex items-center justify-center gap-2 w-full bg-aws-navy-light hover:bg-aws-navy text-aws-text py-2.5 rounded-lg border border-aws-border hover:border-aws-orange/30 transition-all text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy Backup Codes
                    </button>

                    <button
                        onClick={onComplete}
                        className="w-full bg-aws-orange hover:bg-aws-orange-dark text-black font-semibold py-3 rounded-lg transition-all duration-200 btn-glow"
                    >
                        Done
                    </button>
                </div>
            )}

            {/* Cancel button */}
            {step < 4 && onClose && (
                <button
                    onClick={onClose}
                    className="w-full text-sm text-aws-text-dim hover:text-aws-text transition-colors py-2"
                >
                    Cancel
                </button>
            )}
        </div>
    );
}

MFASetupWizard.propTypes = {
    onComplete: PropTypes.func,
    onClose: PropTypes.func,
};


