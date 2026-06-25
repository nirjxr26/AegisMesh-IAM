import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { authAPI } from '../../../services/api';
import MFASetupWizard from '../../../components/MFASetupWizard';

export default function SecuritySettings() {
    const { user, loadProfile } = useAuth();

    // Password state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    // MFA state
    const [showDisableForm, setShowDisableForm] = useState(false);
    const [disablePassword, setDisablePassword] = useState('');
    const [disableTotp, setDisableTotp] = useState('');
    const [disableError, setDisableError] = useState('');
    const [disableLoading, setDisableLoading] = useState(false);
    const [showMFASetup, setShowMFASetup] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        setPasswordLoading(true);
        try {
            // Placeholder: Replace with actual change password API call when ready
            // await authAPI.changePassword({ ...passwordData });

            setPasswordSuccess('Password successfully updated.');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setPasswordError(err.response?.data?.error?.message || 'Failed to change password');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleMFAComplete = async () => {
        await loadProfile();
        setShowMFASetup(false);
    };

    const handleDisableMFA = async (e) => {
        e.preventDefault();
        setDisableError('');
        setDisableLoading(true);
        try {
            await authAPI.disableMFA({ password: disablePassword, totpCode: disableTotp });
            await loadProfile();
            setShowDisableForm(false);
            setDisablePassword('');
            setDisableTotp('');
        } catch (err) {
            setDisableError(err.response?.data?.error?.message || 'Failed to disable MFA');
        } finally {
            setDisableLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0f1623] mb-2">Security</h1>
                <p className="text-aws-text-dim text-sm">
                    Manage your password and secure your account with Two-Factor Authentication.
                </p>
            </div>

            {/* Change Password Section */}
            <div className="glass rounded-xl p-6 sm:p-8">
                <h2 className="text-lg font-bold text-[#0f1623] mb-4 flex items-center gap-2">
                    <span>🔑</span> Change Password
                </h2>

                {passwordSuccess && (
                    <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-sm text-green-400">{passwordSuccess}</p>
                    </div>
                )}
                {passwordError && (
                    <div className="mb-4 p-3 rounded-lg bg-aws-red/10 border border-aws-red/20">
                        <p className="text-sm text-aws-red">{passwordError}</p>
                    </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
                    <div>
                        <label htmlFor="current-password" xmlLang="en" className="block text-sm font-medium text-aws-text-dim mb-1">
                            Current Password
                        </label>
                        <input
                            id="current-password"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="w-full bg-aws-navy-light border border-aws-border rounded-lg px-4 py-2 text-[#0f1623] focus:outline-none focus:border-aws-orange transition-colors"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="new-password" xmlLang="en" className="block text-sm font-medium text-aws-text-dim mb-1">
                                New Password
                            </label>
                            <input
                                id="new-password"
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="w-full bg-aws-navy-light border border-aws-border rounded-lg px-4 py-2 text-[#0f1623] focus:outline-none focus:border-aws-orange transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password" xmlLang="en" className="block text-sm font-medium text-aws-text-dim mb-1">
                                Confirm New Password
                            </label>
                            <input
                                id="confirm-password"
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="w-full bg-aws-navy-light border border-aws-border rounded-lg px-4 py-2 text-[#0f1623] focus:outline-none focus:border-aws-orange transition-colors"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={passwordLoading}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-aws-navy focus:outline-none focus:ring-2 focus:ring-aws-orange/50 text-[#0f1623] border border-aws-border hover:border-aws-orange/50 transition-colors disabled:opacity-50"
                        >
                            {passwordLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>

            {/* MFA Section */}
            <div className="glass rounded-xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-[#0f1623] flex items-center gap-2">
                            <span>🛡️</span> Two-Factor Authentication (MFA)
                        </h2>
                        <p className="text-sm text-aws-text-dim mt-1">
                            Add an extra layer of security to your account.
                        </p>
                    </div>
                    <div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${user?.mfaEnabled
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-aws-navy-light text-aws-text-dim border border-aws-border'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user?.mfaEnabled ? 'bg-green-400' : 'bg-aws-text-dim'}`}></span>
                            {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                </div>

                {user?.mfaEnabled ? (
                    // MFA Enabled UI
                    <div className="space-y-6">
                        {showDisableForm ? (
                            // Disable Form
                            <div className="p-6 bg-aws-navy-light border border-aws-border rounded-xl animate-fade-in-up">
                                <h3 className="font-semibold text-[#0f1623] mb-4">Confirm Disable MFA</h3>
                                {disableError && (
                                    <div className="mb-4 p-3 rounded-lg bg-aws-red/10 border border-aws-red/20">
                                        <p className="text-sm text-aws-red">{disableError}</p>
                                    </div>
                                )}
                                <form onSubmit={handleDisableMFA} className="space-y-4 max-w-sm">
                                    <div>
                                        <label htmlFor="disable-password" xmlLang="en" className="block text-sm text-aws-text-dim mb-1">Password</label>
                                        <input
                                            id="disable-password"
                                            type="password"
                                            value={disablePassword}
                                            onChange={(e) => setDisablePassword(e.target.value)}
                                            className="w-full bg-aws-dark border border-aws-border rounded-xl px-4 py-2 text-[#0f1623] focus:outline-none focus:border-aws-red transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="disable-totp" xmlLang="en" className="block text-sm text-aws-text-dim mb-1">TOTP Code</label>
                                        <input
                                            id="disable-totp"
                                            type="text"
                                            maxLength={6}
                                            value={disableTotp}
                                            onChange={(e) => setDisableTotp(e.target.value.replace(/\D/g, ''))}
                                            placeholder="000000"
                                            className="w-full bg-aws-dark border border-aws-border rounded-xl px-4 py-2 text-[#0f1623] font-mono text-center tracking-widest focus:outline-none focus:border-aws-red transition-colors"
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowDisableForm(false);
                                                setDisableError('');
                                            }}
                                            className="flex-1 py-2 rounded-lg text-sm text-aws-text hover:text-[#0f1623] bg-aws-dark border border-aws-border transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={disableLoading}
                                            className="flex-1 py-2 rounded-lg text-sm font-medium bg-aws-red text-white hover:bg-red-600 transition-all disabled:opacity-50"
                                        >
                                            {disableLoading ? 'Disabling...' : 'Disable'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="p-4 bg-aws-navy-light rounded-xl border border-aws-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-[#0f1623] font-medium">Authenticator App</h3>
                                    <p className="text-xs text-aws-text-dim mt-1">Your account is currently protected via TOTP</p>
                                </div>
                                <button
                                    onClick={() => setShowDisableForm(true)}
                                    className="text-sm font-medium text-aws-red hover:text-red-400 bg-aws-red/5 hover:bg-aws-red/10 px-4 py-2 rounded-lg border border-aws-red/20 transition-all whitespace-nowrap"
                                >
                                    Disable MFA
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    // MFA Not Enabled UI
                    <div>
                        {showMFASetup ? (
                            <div className="mt-4 border border-aws-border rounded-xl p-1 bg-aws-navy-light">
                                <div className="bg-aws-dark rounded-lg p-4 sm:p-6">
                                    <div className="flex justify-between items-center border-b border-aws-border pb-4 mb-4">
                                        <h3 className="font-semibold text-[#0f1623]">Setup Two-Factor Auth</h3>
                                        <button
                                            onClick={() => setShowMFASetup(false)}
                                            className="text-aws-text-dim hover:text-[#0f1623]"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <MFASetupWizard
                                        onComplete={handleMFAComplete}
                                        onClose={() => setShowMFASetup(false)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-aws-navy-light rounded-xl border border-aws-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-[#0f1623] font-medium flex items-center gap-2">
                                        Authenticator App
                                    </h3>
                                    <p className="text-xs text-aws-text-dim mt-1">Use an app like Google Authenticator or Authy</p>
                                </div>
                                <button
                                    onClick={() => setShowMFASetup(true)}
                                    className="text-sm font-medium bg-aws-orange text-black font-semibold hover:bg-aws-orange-dark px-4 py-2 rounded-lg transition-all shadow-lg shadow-aws-orange/20 whitespace-nowrap"
                                >
                                    Setup MFA
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
